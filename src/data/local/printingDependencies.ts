import type {
  LabelPrinterRepository,
  PrinterDiscoveryRepository,
  PrintingDependencies,
  PrintingDependenciesOverrides,
} from "../../features/printing/domain/repository";

let defaultLabelPrinterRepository: LabelPrinterRepository | null = null;
let defaultPrinterDiscoveryRepository: PrinterDiscoveryRepository | null = null;

function getDefaultLabelPrinterRepository(): LabelPrinterRepository {
  if (defaultLabelPrinterRepository) {
    return defaultLabelPrinterRepository;
  }

  const { TcpLabelPrinterRepositoryImpl } =
    // Lazy load avoids pulling react-native-tcp-socket's native module in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./TcpLabelPrinterRepositoryImpl") as typeof import("./TcpLabelPrinterRepositoryImpl");

  defaultLabelPrinterRepository = new TcpLabelPrinterRepositoryImpl();
  return defaultLabelPrinterRepository;
}

function getDefaultDecodeLabelBitmap(): PrintingDependencies["decodeLabelBitmap"] {
  // Lazy load avoids pulling @shopify/react-native-skia's native module in unit tests.
  const { decodeCapturedLabelToRgbaPixels } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./SkiaPixelDecoder") as typeof import("./SkiaPixelDecoder");

  return decodeCapturedLabelToRgbaPixels;
}

function getDefaultPrinterDiscoveryRepository(): PrinterDiscoveryRepository {
  if (defaultPrinterDiscoveryRepository) {
    return defaultPrinterDiscoveryRepository;
  }

  const { TcpPrinterDiscoveryRepositoryImpl } =
    // Lazy load avoids pulling react-native-tcp-socket's native module in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./TcpPrinterDiscoveryRepositoryImpl") as typeof import("./TcpPrinterDiscoveryRepositoryImpl");

  defaultPrinterDiscoveryRepository = new TcpPrinterDiscoveryRepositoryImpl();
  return defaultPrinterDiscoveryRepository;
}

function getDefaultGetLocalNetworkInfo(): PrintingDependencies["getLocalNetworkInfo"] {
  // Lazy load avoids pulling @react-native-community/netinfo's native module in unit tests.
  const { getLocalNetworkInfo } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./networkInfo") as typeof import("./networkInfo");

  return getLocalNetworkInfo;
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
