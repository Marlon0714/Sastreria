import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import type { PrintingDependencies } from "../domain/repository";
import { PrintingDependenciesProvider } from "./PrintingDependenciesProvider";
import { usePrinterDiscovery } from "./usePrinterDiscovery";

const noopLabelPrinter: PrintingDependencies["labelPrinterRepository"] = {
  printLabelJob: async () => Promise.reject(new Error("noop")),
};
const noopDecodeLabelBitmap: PrintingDependencies["decodeLabelBitmap"] = () => ({
  pixels: new Uint8Array(0),
  width: 0,
  height: 0,
});

function makeWrapper(dependencies: PrintingDependencies) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <PrintingDependenciesProvider dependencies={dependencies}>
        {children}
      </PrintingDependenciesProvider>
    );
  };
}

describe("usePrinterDiscovery", () => {
  it("encadena getLocalNetworkInfo → computeSubnetHosts → scanPort y expone los hosts encontrados (caso feliz)", async () => {
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.resolve(["192.168.1.50", "192.168.1.51"]),
    );
    const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
      Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    expect(result.current.isScanning).toBe(false);
    expect(result.current.results).toEqual([]);

    await act(async () => {
      await result.current.scan();
    });

    expect(getLocalNetworkInfo).toHaveBeenCalledTimes(1);
    const [hosts, port, timeoutMs] = scanPort.mock.calls[0]!;
    expect(hosts).toHaveLength(254);
    expect(hosts).toContain("192.168.1.50");
    expect(port).toBe(9100);
    expect(timeoutMs).toBe(500);
    expect(result.current.results).toEqual(["192.168.1.50", "192.168.1.51"]);
    expect(result.current.error).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });

  it("expone un error y no llama a scanPort cuando no hay conexión WiFi/Ethernet", async () => {
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.resolve([]),
    );
    const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
      Promise.resolve(null),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    await act(async () => {
      await result.current.scan();
    });

    expect(scanPort).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toMatch(/no se detectó una red wifi/i);
  });

  it("expone un aviso de red demasiado grande cuando el rango excede el máximo soportado", async () => {
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.resolve([]),
    );
    const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
      Promise.resolve({ ipAddress: "10.0.5.20", subnetMask: "255.255.0.0" }),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    await act(async () => {
      await result.current.scan();
    });

    expect(scanPort).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/demasiado grande/i);
  });

  it("expone results vacío sin error cuando el escaneo no encuentra ninguna impresora", async () => {
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.resolve([]),
    );
    const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
      Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("marca isScanning en true mientras el escaneo está en curso", async () => {
    // El "hang" se coloca en el primer await de la orquestación
    // (`getLocalNetworkInfo`), igual que en `usePrintArregloLabel.test.tsx`
    // con `capture()`: es el único punto donde el ejecutor de la promesa
    // corre de forma síncrona dentro del `act()` inicial, antes de que se
    // vacíe la cola de microtareas.
    let resolveNetworkInfo:
      | ((info: Awaited<ReturnType<PrintingDependencies["getLocalNetworkInfo"]>>) => void)
      | undefined;
    const getLocalNetworkInfo = jest.fn(
      () =>
        new Promise<Awaited<ReturnType<PrintingDependencies["getLocalNetworkInfo"]>>>(
          (resolve) => {
            resolveNetworkInfo = resolve;
          },
        ),
    );
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.resolve(["192.168.1.50"]),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    let scanPromise: Promise<void> = Promise.resolve();
    act(() => {
      scanPromise = result.current.scan();
    });

    expect(result.current.isScanning).toBe(true);

    await act(async () => {
      resolveNetworkInfo?.({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" });
      await scanPromise;
    });

    expect(result.current.isScanning).toBe(false);
  });

  it("expone un error genérico si scanPort rechaza inesperadamente", async () => {
    const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
      async () => Promise.reject(new Error("fallo de socket inesperado")),
    );
    const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
      Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
    );
    const dependencies: PrintingDependencies = {
      labelPrinterRepository: noopLabelPrinter,
      decodeLabelBitmap: noopDecodeLabelBitmap,
      printerDiscoveryRepository: { scanPort },
      getLocalNetworkInfo,
    };

    const { result } = renderHook(() => usePrinterDiscovery(), {
      wrapper: makeWrapper(dependencies),
    });

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.error).toBe("Ocurrió un error al buscar impresoras en la red.");
    expect(result.current.isScanning).toBe(false);
  });
});
