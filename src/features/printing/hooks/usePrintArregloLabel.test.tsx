import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import type { PrintingDependencies } from "../domain/repository";
import type { CapturedLabelBitmap, PrinterTarget } from "../domain/types";
import { PrintingDependenciesProvider } from "./PrintingDependenciesProvider";
import { usePrintArregloLabel } from "./usePrintArregloLabel";

const target: PrinterTarget = {
  id: "printer-1",
  name: "Mostrador",
  host: "192.168.1.50",
  port: 9100,
};

function makeCapturedBitmap(): CapturedLabelBitmap {
  return { base64Png: "fake-base64", width: 8, height: 1 };
}

function makeWrapper(dependencies: PrintingDependencies) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <PrintingDependenciesProvider dependencies={dependencies}>
        {children}
      </PrintingDependenciesProvider>
    );
  };
}

describe("usePrintArregloLabel", () => {
  it.each([
    { protocol: undefined, prefix: "SIZE " },
    { protocol: "tspl-bitmap" as const, prefix: "SIZE " },
    { protocol: "escpos-raster" as const, prefix: "\x1b@" },
  ])(
    "encadena el flujo de impresión con protocolo $protocol",
    async ({ protocol, prefix }) => {
      const printLabelJob = jest.fn<
        PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
      >(async () => Promise.resolve());
      const decodeLabelBitmap = jest.fn<
        PrintingDependencies["decodeLabelBitmap"]
      >(() => ({
        pixels: new Uint8Array(8 * 4).fill(0), // todo blanco
        width: 8,
        height: 1,
      }));
      const dependencies: PrintingDependencies = {
        labelPrinterRepository: { printLabelJob },
        decodeLabelBitmap,
        printerDiscoveryRepository: {
          scanPort: jest.fn(async () => Promise.resolve([])),
        },
        getLocalNetworkInfo: jest.fn(async () => Promise.resolve(null)),
      };

      const { result } = renderHook(() => usePrintArregloLabel(), {
        wrapper: makeWrapper(dependencies),
      });

      const capture = jest.fn(async () =>
        Promise.resolve(makeCapturedBitmap()),
      );
      const configuredTarget = { ...target, protocol };

      await act(async () => {
        await result.current.printLabel({ capture, target: configuredTarget });
      });

      expect(capture).toHaveBeenCalledTimes(1);
      expect(decodeLabelBitmap).toHaveBeenCalledWith(makeCapturedBitmap());
      expect(printLabelJob).toHaveBeenCalledTimes(1);
      const [calledTarget, job] = printLabelJob.mock.calls[0]!;
      expect(calledTarget).toBe(configuredTarget);
      expect(job).toBeInstanceOf(Uint8Array);
      expect(
        Array.from(job.slice(0, prefix.length), (byte) =>
          String.fromCharCode(byte),
        ).join(""),
      ).toBe(prefix);
      expect(result.current.isPrinting).toBe(false);
    },
  );

  it("propaga el error si la impresora rechaza el trabajo, y deja isPrinting en false", async () => {
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () =>
      Promise.reject(new Error("No se pudo conectar con la impresora")),
    );
    const decodeLabelBitmap = jest.fn<
      PrintingDependencies["decodeLabelBitmap"]
    >(() => ({
      pixels: new Uint8Array(8 * 4).fill(0),
      width: 8,
      height: 1,
    }));
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap,
      printerDiscoveryRepository: {
        scanPort: jest.fn(async () => Promise.resolve([])),
      },
      getLocalNetworkInfo: jest.fn(async () => Promise.resolve(null)),
    };

    const { result } = renderHook(() => usePrintArregloLabel(), {
      wrapper: makeWrapper(dependencies),
    });

    const capture = jest.fn(async () => Promise.resolve(makeCapturedBitmap()));

    await expect(
      act(async () => {
        await result.current.printLabel({ capture, target });
      }),
    ).rejects.toThrow("No se pudo conectar con la impresora");

    expect(result.current.isPrinting).toBe(false);
  });

  it("rechaza el segundo envío mientras la primera captura sigue pendiente", async () => {
    let finish: ((bitmap: CapturedLabelBitmap) => void) | undefined;
    const capture = jest.fn(
      () =>
        new Promise<CapturedLabelBitmap>((resolve) => {
          finish = resolve;
        }),
    );
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () => {});
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap: () => ({
        pixels: new Uint8Array(32),
        width: 8,
        height: 1,
      }),
      printerDiscoveryRepository: { scanPort: async () => [] },
      getLocalNetworkInfo: async () => null,
    };
    const { result } = renderHook(() => usePrintArregloLabel(), {
      wrapper: makeWrapper(dependencies),
    });
    let first: Promise<void> | undefined;
    act(() => {
      first = result.current.printLabel({ capture, target });
    });
    await act(async () => {
      await expect(
        result.current.printLabel({ capture, target }),
      ).rejects.toThrow(/en curso/);
    });
    expect(capture).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish?.(makeCapturedBitmap());
      await first;
    });
    expect(printLabelJob).toHaveBeenCalledTimes(1);
  });

  it("marca isPrinting en true mientras la captura está en curso", async () => {
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () => Promise.resolve());
    const decodeLabelBitmap = jest.fn<
      PrintingDependencies["decodeLabelBitmap"]
    >(() => ({
      pixels: new Uint8Array(8 * 4).fill(0),
      width: 8,
      height: 1,
    }));
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap,
      printerDiscoveryRepository: {
        scanPort: jest.fn(async () => Promise.resolve([])),
      },
      getLocalNetworkInfo: jest.fn(async () => Promise.resolve(null)),
    };

    const { result } = renderHook(() => usePrintArregloLabel(), {
      wrapper: makeWrapper(dependencies),
    });

    let resolveCapture: ((bitmap: CapturedLabelBitmap) => void) | undefined;
    const capture = jest.fn(
      () =>
        new Promise<CapturedLabelBitmap>((resolve) => {
          resolveCapture = resolve;
        }),
    );

    let printPromise: Promise<void> = Promise.resolve();
    act(() => {
      printPromise = result.current.printLabel({ capture, target });
    });

    expect(result.current.isPrinting).toBe(true);

    await act(async () => {
      resolveCapture?.(makeCapturedBitmap());
      await printPromise;
    });

    expect(result.current.isPrinting).toBe(false);
  });
});
