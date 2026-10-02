import { mmToDots } from "./paperSize";

/** DPI asumido para la etiqueta (203 DPI = 8 dots/mm). */
export const ARREGLO_LABEL_DPI = 203;

/**
 * Medida física real de la etiqueta adhesiva (confirmada con el dueño),
 * usada como default cuando una `PrinterTarget` no trae
 * `labelWidthMm`/`labelLengthMm` propios.
 */
export const DEFAULT_LABEL_WIDTH_MM = 50;
export const DEFAULT_LABEL_LENGTH_MM = 70;

/**
 * Lienzo (en dots, antes de rotar) con el que se diseña y captura
 * `ArregloLabelView`: el tamaño físico por defecto en landscape, para que 1
 * punto de layout sea 1 dot impreso y el escalado final no deforme ni
 * ablande el texto.
 */
export const ARREGLO_LABEL_CANVAS_WIDTH_PX = mmToDots(
  DEFAULT_LABEL_LENGTH_MM,
  ARREGLO_LABEL_DPI,
);
export const ARREGLO_LABEL_CANVAS_HEIGHT_PX = mmToDots(
  DEFAULT_LABEL_WIDTH_MM,
  ARREGLO_LABEL_DPI,
);

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
  /** Monto ya pagado a cuenta de `price` — distinto de `saldo` (lo que falta). */
  abono?: number;
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
 * - "tspl-bitmap": comando `BITMAP` de TSPL (ver `buildTsplBitmapJob`) —
 *   protocolo completamente distinto de ESC/POS, necesario para impresoras
 *   2-en-1 cuyo "modo etiqueta" (con sensor de espacio entre etiquetas) no
 *   entiende ESC/POS en absoluto.
 */
export type PrintProtocol = "escpos-raster" | "escpos-bitimage" | "tspl-bitmap";

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
   * tienen — se asume "tspl-bitmap" en el punto de uso (ver
   * `printRenderer.ts`).
   */
  protocol?: PrintProtocol;
  /**
   * Medida física real de la etiqueta adhesiva cargada en esta impresora
   * (confirmada con el dueño: 50mm × 70mm). El contenido se reescala a esta
   * medida antes de imprimir (ver `scalePixels.ts`/`usePrintArregloLabel.ts`)
   * para aprovechar el tamaño real de la etiqueta en vez de quedarse con lo
   * que mida el contenido naturalmente. Opcional — impresoras ya guardadas
   * o construidas a mano en tests no lo tienen; se asume 50×70mm en el
   * punto de uso. Específico de cómo se escala la etiqueta de arreglo, no
   * un concepto genérico de "papel de impresora" todavía.
   */
  labelWidthMm?: number;
  labelLengthMm?: number;
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
 * Resultado de `LabelBitmapDecoder`: píxeles RGBA crudos conservados a la
 * resolución original de la captura, junto con las
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
