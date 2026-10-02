/**
 * Reescala un buffer de píxeles RGBA (4 bytes por píxel) a un tamaño
 * destino exacto promediando el área que cada píxel destino cubre en el
 * origen. Al achicar, el vecino más cercano descartaba píxeles y dejaba texto
 * y logos dentados; el promedio conserva el antialiasing que luego
 * `toMonochromeBitmap` umbraliza.
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
  const xRatio = width / targetWidth;
  const yRatio = height / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const top = y * yRatio;
    const bottom = top + yRatio;
    const lastRow = Math.min(height, Math.ceil(bottom));

    for (let x = 0; x < targetWidth; x += 1) {
      const left = x * xRatio;
      const right = left + xRatio;
      const lastColumn = Math.min(width, Math.ceil(right));

      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let totalWeight = 0;

      for (let sourceY = Math.floor(top); sourceY < lastRow; sourceY += 1) {
        const rowWeight =
          Math.min(sourceY + 1, bottom) - Math.max(sourceY, top);
        for (
          let sourceX = Math.floor(left);
          sourceX < lastColumn;
          sourceX += 1
        ) {
          const weight =
            rowWeight *
            (Math.min(sourceX + 1, right) - Math.max(sourceX, left));
          const sourceIndex = (sourceY * width + sourceX) * 4;

          red += pixels[sourceIndex]! * weight;
          green += pixels[sourceIndex + 1]! * weight;
          blue += pixels[sourceIndex + 2]! * weight;
          alpha += pixels[sourceIndex + 3]! * weight;
          totalWeight += weight;
        }
      }

      const destIndex = (y * targetWidth + x) * 4;
      scaled[destIndex] = Math.round(red / totalWeight);
      scaled[destIndex + 1] = Math.round(green / totalWeight);
      scaled[destIndex + 2] = Math.round(blue / totalWeight);
      scaled[destIndex + 3] = Math.round(alpha / totalWeight);
    }
  }

  return { pixels: scaled, width: targetWidth, height: targetHeight };
}
