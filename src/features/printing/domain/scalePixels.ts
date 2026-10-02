/**
 * Reescala un buffer de píxeles RGBA (4 bytes por píxel) a un tamaño
 * destino exacto, por remuestreo de vecino más cercano. Suficiente para
 * contenido de texto/líneas (no hace falta interpolación más suave) y
 * mucho más simple de razonar/depurar.
 *
 * Existe para que la etiqueta impresa ocupe el tamaño físico real
 * configurado (`PrinterTarget.labelWidthMm`/`labelLengthMm`, ver
 * `mmToDots`/`PaperSize`) en vez de quedarse con el tamaño natural que
 * midió el contenido al capturarlo.
 */
export function scaleRgbaPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): { pixels: Uint8Array; width: number; height: number } {
  const scaled = new Uint8Array(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y * height) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x * width) / targetWidth));
      const sourceIndex = (sourceY * width + sourceX) * 4;
      const destIndex = (y * targetWidth + x) * 4;

      scaled[destIndex] = pixels[sourceIndex]!;
      scaled[destIndex + 1] = pixels[sourceIndex + 1]!;
      scaled[destIndex + 2] = pixels[sourceIndex + 2]!;
      scaled[destIndex + 3] = pixels[sourceIndex + 3]!;
    }
  }

  return { pixels: scaled, width: targetWidth, height: targetHeight };
}
