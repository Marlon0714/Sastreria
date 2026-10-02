import { describe, expect, it } from "@jest/globals";

import { rotatePixelsClockwise90 } from "./rotatePixels";

/** Arma un buffer RGBA de 2x3 donde cada píxel tiene un valor R distinto (1..6), para rastrear posiciones. */
function build2x3Pixels(): Uint8Array {
  const pixels = new Uint8Array(2 * 3 * 4);
  for (let i = 0; i < 6; i += 1) {
    pixels[i * 4] = i + 1; // R = 1..6, resto (G,B,A) en 0
  }
  return pixels;
}

describe("rotatePixelsClockwise90", () => {
  it("intercambia width/height", () => {
    const { width, height } = rotatePixelsClockwise90(build2x3Pixels(), 2, 3);

    expect(width).toBe(3);
    expect(height).toBe(2);
  });

  it("mueve cada píxel a la posición correcta (rotación horaria)", () => {
    // Origen 2x3 (width=2, height=3), píxel (x,y) tiene R = y*2+x+1:
    // (0,0)=1 (1,0)=2
    // (0,1)=3 (1,1)=4
    // (0,2)=5 (1,2)=6
    const { pixels, width } = rotatePixelsClockwise90(build2x3Pixels(), 2, 3);

    function rAt(x: number, y: number): number {
      return pixels[(y * width + x) * 4]!;
    }

    // Rotado horario: la columna izquierda original (1,3,5) pasa a ser la fila superior (de atrás hacia adelante)
    expect(rAt(0, 0)).toBe(5);
    expect(rAt(1, 0)).toBe(3);
    expect(rAt(2, 0)).toBe(1);
    expect(rAt(0, 1)).toBe(6);
    expect(rAt(1, 1)).toBe(4);
    expect(rAt(2, 1)).toBe(2);
  });

  it("no pierde ni agrega bytes (mismo total que el origen)", () => {
    const original = build2x3Pixels();
    const { pixels } = rotatePixelsClockwise90(original, 2, 3);

    expect(pixels.length).toBe(original.length);
  });

  it("funciona con una imagen de 1x1 (caso trivial)", () => {
    const pixels = new Uint8Array([10, 20, 30, 40]);

    const result = rotatePixelsClockwise90(pixels, 1, 1);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(Array.from(result.pixels)).toEqual([10, 20, 30, 40]);
  });
});
