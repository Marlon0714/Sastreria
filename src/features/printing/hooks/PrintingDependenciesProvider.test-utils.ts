/**
 * Test utility — crea un PrintingDependencies "no-op" para envolver
 * pantallas/componentes en tests donde las llamadas reales al repositorio de
 * impresión están mockeadas a nivel de hook.
 *
 * Uso: <PrintingDependenciesProvider dependencies={noopPrintingDependencies}>
 */
import type { PrintingDependencies } from "../domain/repository";

export const noopPrintingDependencies: PrintingDependencies = {
  labelPrinterRepository: {
    printLabelJob: async () => Promise.reject(new Error("noop")),
  },
  decodeLabelBitmap: () => ({ pixels: new Uint8Array(0), width: 0, height: 0 }),
  printerDiscoveryRepository: {
    scanPort: async () => Promise.resolve([]),
  },
  getLocalNetworkInfo: async () => Promise.resolve(null),
};
