import type { CapturedLabelBitmap, PrinterTarget } from "./types";

/**
 * Puerto agnóstico de marca/protocolo para enviar un trabajo de impresión ya
 * armado (bytes ESC/POS, ver `escposRaster.ts`) a una impresora térmica
 * configurada. Toda decisión de protocolo/transporte (TCP, puerto 9100,
 * ESC/POS) vive exclusivamente en el adaptador de infra
 * (`src/data/local/TcpLabelPrinterRepositoryImpl.ts`) — dominio y hooks solo
 * conocen esta interfaz.
 */
export interface LabelPrinterRepository {
  printLabelJob(target: PrinterTarget, job: Uint8Array): Promise<void>;
}

/**
 * Decodifica una captura de `ArregloLabelView` (PNG base64) a píxeles RGBA
 * crudos. Aislado como dependencia inyectable (en vez de un import directo
 * de `@shopify/react-native-skia` en el hook de orquestación) para poder
 * testear `usePrintArregloLabel` sin el motor nativo de Skia — ver
 * `src/data/local/SkiaPixelDecoder.ts` para la implementación real.
 */
export type LabelBitmapDecoder = (captured: CapturedLabelBitmap) => Uint8Array;

/**
 * Puerto agnóstico de transporte para el descubrimiento de impresoras en la
 * red local: prueba, para cada host candidato de `hosts`, si `port` responde
 * dentro de `timeoutMs` y retorna solo los hosts que sí respondieron. Igual
 * que `LabelPrinterRepository`, el dominio/hooks no conocen el mecanismo real
 * (socket TCP crudo) — vive exclusivamente en
 * `src/data/local/TcpPrinterDiscoveryRepositoryImpl.ts`.
 */
export interface PrinterDiscoveryRepository {
  scanPort(hosts: string[], port: number, timeoutMs: number): Promise<string[]>;
}

/**
 * IP local + máscara de subred del dispositivo, obtenidas de la conexión
 * WiFi/Ethernet activa (ver `src/data/local/networkInfo.ts`). `null` cuando
 * no hay una red soportada (p. ej. datos móviles, o sin conexión) — el hook
 * que la consume (`usePrinterDiscovery`) trata ese caso como "no se puede
 * escanear, agrega la IP a mano".
 */
export type LocalNetworkInfo = { ipAddress: string; subnetMask: string } | null;

export interface PrintingDependencies {
  labelPrinterRepository: LabelPrinterRepository;
  decodeLabelBitmap: LabelBitmapDecoder;
  printerDiscoveryRepository: PrinterDiscoveryRepository;
  getLocalNetworkInfo: () => Promise<LocalNetworkInfo>;
}

export type PrintingDependenciesOverrides = Partial<PrintingDependencies>;
