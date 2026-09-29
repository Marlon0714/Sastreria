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
  it("encadena captura → decodificación → empaquetado → impresión (caso feliz)", async () => {
    const printLabelJob = jest.fn<PrintingDependencies["labelPrinterRepository"]["printLabelJob"]>(
      async () => Promise.resolve(),
    );
    const decodeLabelBitmap = jest.fn<PrintingDependencies["decodeLabelBitmap"]>(() => ({
      pixels: new Uint8Array(8 * 4).fill(0), // todo blanco
      width: 8,
      height: 1,
    }));
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap,
      printerDiscoveryRepository: { scanPort: jest.fn(async () => Promise.resolve([])) },
      getLocalNetworkInfo: jest.fn(async () => Promise.resolve(null)),
    };

    const { result } = renderHook(() => usePrintArregloLabel(), {
      wrapper: makeWrapper(dependencies),
    });

    const capture = jest.fn(async () => Promise.resolve(makeCapturedBitmap()));

    await act(async () => {
      await result.current.printLabel({ capture, target });
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(decodeLabelBitmap).toHaveBeenCalledWith(makeCapturedBitmap());
    expect(printLabelJob).toHaveBeenCalledTimes(1);
    const [calledTarget, job] = printLabelJob.mock.calls[0]!;
    expect(calledTarget).toBe(target);
    expect(job).toBeInstanceOf(Uint8Array);
    expect(result.current.isPrinting).toBe(false);
  });

  it("propaga el error si la impresora rechaza el trabajo, y deja isPrinting en false", async () => {
    const printLabelJob = jest.fn<PrintingDependencies["labelPrinterRepository"]["printLabelJob"]>(
      async () => Promise.reject(new Error("No se pudo conectar con la impresora")),
    );
    const decodeLabelBitmap = jest.fn<PrintingDependencies["decodeLabelBitmap"]>(() => ({
      pixels: new Uint8Array(8 * 4).fill(0),
      width: 8,
      height: 1,
    }));
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap,
      printerDiscoveryRepository: { scanPort: jest.fn(async () => Promise.resolve([])) },
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

  it("marca isPrinting en true mientras la captura está en curso", async () => {
    const printLabelJob = jest.fn<PrintingDependencies["labelPrinterRepository"]["printLabelJob"]>(
      async () => Promise.resolve(),
    );
    const decodeLabelBitmap = jest.fn<PrintingDependencies["decodeLabelBitmap"]>(() => ({
      pixels: new Uint8Array(8 * 4).fill(0),
      width: 8,
      height: 1,
    }));
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: { printLabelJob },
      decodeLabelBitmap,
      printerDiscoveryRepository: { scanPort: jest.fn(async () => Promise.resolve([])) },
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
