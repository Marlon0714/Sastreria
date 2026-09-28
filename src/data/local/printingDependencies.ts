import type {
  LabelPrinterRepository,
  PrinterDiscoveryRepository,
  PrintingDependencies,
  PrintingDependenciesOverrides,
} from "../../features/printing/domain/repository";

let defaultLabelPrinterRepository: LabelPrinterRepository | null = null;
let defaultPrinterDiscoveryRepository: PrinterDiscoveryRepository | null = null;

// Mensaje mostrado si el módulo nativo de impresión no está disponible en el
// binario instalado (p. ej. build vieja sin react-native-tcp-socket /
// @shopify/react-native-skia todavía enlazados). Nunca debe impedir que el
// resto de la app arranque — ver logUnavailable().
const UNAVAILABLE_MESSAGE =
  "Impresión no disponible en este build. Actualiza la app para usar esta función.";

function logUnavailable(dependency: string, err: unknown): void {
  console.error(
    JSON.stringify({
      level: "error",
      service: "printingDependencies",
      message: `No se pudo cargar la dependencia de impresión "${dependency}"; se usa un stub seguro`,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

function getDefaultLabelPrinterRepository(): LabelPrinterRepository {
  if (defaultLabelPrinterRepository) {
    return defaultLabelPrinterRepository;
  }

  try {
    const { TcpLabelPrinterRepositoryImpl } =
      // Lazy load avoids pulling react-native-tcp-socket's native module in unit tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./TcpLabelPrinterRepositoryImpl") as typeof import("./TcpLabelPrinterRepositoryImpl");

    defaultLabelPrinterRepository = new TcpLabelPrinterRepositoryImpl();
  } catch (err) {
    logUnavailable("TcpLabelPrinterRepositoryImpl", err);
    defaultLabelPrinterRepository = {
      printLabelJob: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
    };
  }

  return defaultLabelPrinterRepository;
}

function getDefaultDecodeLabelBitmap(): PrintingDependencies["decodeLabelBitmap"] {
  try {
    // Lazy load avoids pulling @shopify/react-native-skia's native module in unit tests.
    const { decodeCapturedLabelToRgbaPixels } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./SkiaPixelDecoder") as typeof import("./SkiaPixelDecoder");

    return decodeCapturedLabelToRgbaPixels;
  } catch (err) {
    logUnavailable("SkiaPixelDecoder", err);
    return () => {
      throw new Error(UNAVAILABLE_MESSAGE);
    };
  }
}

function getDefaultPrinterDiscoveryRepository(): PrinterDiscoveryRepository {
  if (defaultPrinterDiscoveryRepository) {
    return defaultPrinterDiscoveryRepository;
  }

  try {
    const { TcpPrinterDiscoveryRepositoryImpl } =
      // Lazy load avoids pulling react-native-tcp-socket's native module in unit tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./TcpPrinterDiscoveryRepositoryImpl") as typeof import("./TcpPrinterDiscoveryRepositoryImpl");

    defaultPrinterDiscoveryRepository = new TcpPrinterDiscoveryRepositoryImpl();
  } catch (err) {
    logUnavailable("TcpPrinterDiscoveryRepositoryImpl", err);
    defaultPrinterDiscoveryRepository = {
      scanPort: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
    };
  }

  return defaultPrinterDiscoveryRepository;
}

function getDefaultGetLocalNetworkInfo(): PrintingDependencies["getLocalNetworkInfo"] {
  try {
    // Lazy load avoids pulling @react-native-community/netinfo's native module in unit tests.
    const { getLocalNetworkInfo } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./networkInfo") as typeof import("./networkInfo");

    return getLocalNetworkInfo;
  } catch (err) {
    logUnavailable("networkInfo", err);
    return () => Promise.resolve(null);
  }
}

export function resolveLabelPrinterRepository(
  repository?: LabelPrinterRepository,
): LabelPrinterRepository {
  return repository ?? getDefaultLabelPrinterRepository();
}

export function getPrintingDependencies(): PrintingDependencies {
  return {
    labelPrinterRepository: getDefaultLabelPrinterRepository(),
    decodeLabelBitmap: getDefaultDecodeLabelBitmap(),
    printerDiscoveryRepository: getDefaultPrinterDiscoveryRepository(),
    getLocalNetworkInfo: getDefaultGetLocalNetworkInfo(),
  };
}

export function createPrintingDependencies(
  overrides: PrintingDependenciesOverrides = {},
): PrintingDependencies {
  return {
    labelPrinterRepository: resolveLabelPrinterRepository(overrides.labelPrinterRepository),
    decodeLabelBitmap: overrides.decodeLabelBitmap ?? getDefaultDecodeLabelBitmap(),
    printerDiscoveryRepository:
      overrides.printerDiscoveryRepository ?? getDefaultPrinterDiscoveryRepository(),
    getLocalNetworkInfo: overrides.getLocalNetworkInfo ?? getDefaultGetLocalNetworkInfo(),
  };
}
