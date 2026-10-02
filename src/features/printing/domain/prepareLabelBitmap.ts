import { toMonochromeBitmap } from "./monochromeBitmap";
import { mmToDots } from "./paperSize";
import { rotatePixelsClockwise90 } from "./rotatePixels";
import { scaleRgbaPixels } from "./scalePixels";
import {
  ARREGLO_LABEL_DPI,
  DEFAULT_LABEL_LENGTH_MM,
  DEFAULT_LABEL_WIDTH_MM,
  type DecodedLabelBitmap,
  type MonochromeBitmap,
  type PrinterTarget,
} from "./types";

/**
 * Encadena los 3 pasos que preparan los píxeles ya decodificados para
 * cualquier renderer de etiqueta: escalar al tamaño físico configurado de
 * la impresora (`labelWidthMm`/`labelLengthMm`, default 50×70mm) → rotar
 * 90° horario (el contenido se renderiza en landscape, la etiqueta física
 * es portrait) → empaquetar a monocromo. Extraído a una sola función
 * porque los 3 puntos que arman un job de etiqueta (el flujo real de
 * impresión y los dos botones de diagnóstico de imagen en
 * `PrinterSettingsScreen`) lo hacían de forma repetida.
 */
export function prepareArregloLabelBitmap(
  decoded: DecodedLabelBitmap,
  printer: PrinterTarget,
): MonochromeBitmap {
  const widthMm = printer.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM;
  const lengthMm = printer.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM;

  const scaled = scaleRgbaPixels(
    decoded.pixels,
    decoded.width,
    decoded.height,
    mmToDots(lengthMm, ARREGLO_LABEL_DPI),
    mmToDots(widthMm, ARREGLO_LABEL_DPI),
  );

  const rotated = rotatePixelsClockwise90(scaled.pixels, scaled.width, scaled.height);

  return toMonochromeBitmap(rotated.pixels, rotated.width, rotated.height);
}
