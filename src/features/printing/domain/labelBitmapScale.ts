/**
 * Calcula la altura proporcional al reescalar una imagen de
 * `sourceWidth` x `sourceHeight` a un ancho fijo `targetWidth`, preservando
 * el aspect ratio. Se usa para forzar el ráster final de la etiqueta siempre
 * al ancho físico de la impresora (`ARREGLO_LABEL_WIDTH_PX`), sin importar a
 * qué resolución real terminó la captura nativa — ver
 * `src/data/local/SkiaPixelDecoder.ts`.
 */
export function computeScaledHeight(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
): number {
  if (sourceWidth <= 0) {
    throw new Error("El ancho de la imagen capturada debe ser mayor que cero");
  }

  return Math.max(1, Math.round(sourceHeight * (targetWidth / sourceWidth)));
}
