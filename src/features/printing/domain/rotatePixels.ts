/**
 * Rota 90° en sentido horario un buffer de píxeles RGBA (4 bytes por píxel,
 * el formato que devuelve `LabelBitmapDecoder`). Existe porque el cabezal de
 * la impresora tiene un ancho físico fijo que no gira — para que la etiqueta
 * salga "de lado" en el papel (pedido explícito del dueño, para aprovechar
 * mejor una etiqueta física más larga que ancha) hay que rotar los píxeles
 * nosotros antes de empaquetarlos a monocromo, no hay forma de pedírselo a
 * la impresora.
 *
 * El píxel en (x, y) del origen (ancho W, alto H) termina en
 * (H-1-y, x) del destino (ancho H, alto W) — fórmula estándar de rotación
 * horaria de una matriz.
 */
export function rotatePixelsClockwise90(
  pixels: Uint8Array,
  width: number,
  height: number,
): { pixels: Uint8Array; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const rotated = new Uint8Array(pixels.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = (y * width + x) * 4;
      const destX = height - 1 - y;
      const destY = x;
      const destIndex = (destY * newWidth + destX) * 4;

      rotated[destIndex] = pixels[sourceIndex]!;
      rotated[destIndex + 1] = pixels[sourceIndex + 1]!;
      rotated[destIndex + 2] = pixels[sourceIndex + 2]!;
      rotated[destIndex + 3] = pixels[sourceIndex + 3]!;
    }
  }

  return { pixels: rotated, width: newWidth, height: newHeight };
}
