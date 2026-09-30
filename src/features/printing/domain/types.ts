/**
 * Ancho fijo (en píxeles) con el que se renderiza y captura
 * `ArregloLabelView`. 384px es el ancho estándar de impresión para rollos de
 * 58mm a 203dpi, la medida más común en impresoras térmicas de etiquetas
 * WiFi económicas — coincide con `bytesPerRow = 48` exacto (384 / 8), sin
 * relleno de bits sobrantes.
 */
export const ARREGLO_LABEL_WIDTH_PX = 384;

/**
 * Datos crudos (sin formatear) de una etiqueta de arreglo. El formateo de
 * despliegue (moneda, fecha) se hace en el punto de uso reutilizando
 * `formatPrice` (`src/features/pricing/domain/strings.ts`) y
 * `formatDateForDisplay` (`src/features/schedule/domain/dateUtils.ts`) — este
 * tipo solo transporta los valores.
 *
 * A propósito NO incluye descripción de la prenda ni ningún código/QR
 * (confirmado con el usuario): la etiqueta física solo debe permitir
 * identificar de quién es la prenda y cuánto se debe.
 */
export interface ArregloLabelData {
  clientName: string;
  clientPhone?: string;
  date?: string; // YYYY-MM-DD, sin formatear
  price?: number;
  saldo?: number;
}

/**
 * Protocolo de impresión con el que se codifica el job de bytes para una
 * impresora dada. Se deja como unión abierta a propósito para que agregar
 * una impresora con otro protocolo (ej. "tspl-raster") en el futuro no
 * requiera tocar hooks/UI, solo sumar un miembro a la unión y una entrada al
 * registro de `printRenderer.ts`.
 *
 * - "escpos-raster": comando `GS v 0` (ver `escposRaster.ts`), el más nuevo
 *   y compacto, pero no todas las impresoras ESC/POS lo soportan.
 * - "escpos-bitimage": comando `ESC *` (ver `buildEscPosBitImageJob`), más
 *   viejo y casi universalmente soportado — alternativa de diagnóstico
 *   cuando una impresora concreta no interpreta bien `GS v 0` (imprime
 *   símbolos en vez de la imagen).
 */
export type PrintProtocol = "escpos-raster" | "escpos-bitimage";

/**
 * Impresora térmica configurada por el dueño (`printerSettingsStore`).
 * Deliberadamente simple: no extiende `BaseEntity` ni tiene `syncStatus` —
 * es configuración local por dispositivo, no una entidad de negocio
 * sincronizada con Supabase.
 */
export interface PrinterTarget {
  id: string;
  name: string;
  host: string;
  port: number;
  /**
   * Opcional: impresoras ya guardadas o construidas a mano en tests no lo
   * tienen — se asume "escpos-raster" en el punto de uso (ver
   * `printRenderer.ts`).
   */
  protocol?: PrintProtocol;
}

/**
 * Resultado de capturar `ArregloLabelView` con `react-native-view-shot`:
 * PNG en base64 más las dimensiones EXACTAS con las que se renderizó la
 * vista (necesarias para decodificar los píxeles después, ver
 * `SkiaPixelDecoder`).
 */
export interface CapturedLabelBitmap {
  base64Png: string;
  width: number;
  height: number;
}

/**
 * Resultado de `LabelBitmapDecoder`: píxeles RGBA crudos ya reescalados al
 * ancho físico fijo de la impresora (`ARREGLO_LABEL_WIDTH_PX`), junto con las
 * dimensiones REALES de ese bitmap — nunca las dimensiones que se le pidieron
 * a la captura (`CapturedLabelBitmap.width/height`), que son solo una
 * solicitud y pueden no coincidir con el PNG real producido por
 * `react-native-view-shot` en un dispositivo concreto. Ver
 * `src/data/local/SkiaPixelDecoder.ts`.
 */
export interface DecodedLabelBitmap {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/**
 * Bitmap monocromo empaquetado 1 bit por píxel (MSB primero), formato que
 * exige el comando ráster ESC/POS `GS v 0` (ver `escposRaster.ts`).
 * `bytesPerRow` es `ceil(width / 8)`: cada fila se redondea a un número
 * entero de bytes: los bits sobrantes de la última columna quedan en 0
 * (blanco).
 */
export interface MonochromeBitmap {
  width: number;
  height: number;
  bytesPerRow: number;
  data: Uint8Array;
}
