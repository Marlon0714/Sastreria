import type { MonochromeBitmap } from "./types";

/**
 * Umbral de luminancia (0-255) bajo el cual un píxel se considera "negro"
 * (se imprime). Elegido a ojo para etiquetas de texto sobre fondo blanco;
 * no hay dithering: es blanco/negro puro, suficiente para texto simple.
 */
const LUMINANCE_THRESHOLD = 128;

/**
 * Convierte píxeles RGBA (4 bytes por píxel, el formato que devuelve
 * `SkiaPixelDecoder`) a un bitmap monocromo empaquetado 1 bit por píxel,
 * MSB primero, que es el formato que exige el comando ESC/POS `GS v 0`
 * (ver `escposRaster.ts`). Un píxel con alfa bajo (transparente) se trata
 * como blanco (no se imprime), igual que uno claro.
 *
 * Bit en 1 = negro/imprime. Bit en 0 = blanco/no imprime (convención
 * estándar del modo ráster ESC/POS).
 */
export function toMonochromeBitmap(
  pixels: Uint8Array,
  width: number,
  height: number,
): MonochromeBitmap {
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      const r = pixels[pixelIndex] ?? 0;
      const g = pixels[pixelIndex + 1] ?? 0;
      const b = pixels[pixelIndex + 2] ?? 0;
      const alpha = pixels[pixelIndex + 3] ?? 0;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlack = alpha >= LUMINANCE_THRESHOLD && luminance < LUMINANCE_THRESHOLD;

      if (isBlack) {
        const byteIndex = y * bytesPerRow + Math.floor(x / 8);
        const bitPositionFromMsb = 7 - (x % 8);
        data[byteIndex] |= 1 << bitPositionFromMsb;
      }
    }
  }

  return { width, height, bytesPerRow, data };
}
