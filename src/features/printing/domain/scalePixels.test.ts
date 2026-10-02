import { describe, expect, it } from "@jest/globals";

import { scaleRgbaPixels } from "./scalePixels";

/** 2x2 RGBA donde cada píxel tiene un valor R distinto: (0,0)=1 (1,0)=2 (0,1)=3 (1,1)=4. */
function build2x2Pixels(): Uint8Array {
  const pixels = new Uint8Array(2 * 2 * 4);
  pixels[0] = 1; // (0,0)
  pixels[4] = 2; // (1,0)
  pixels[8] = 3; // (0,1)
  pixels[12] = 4; // (1,1)
  return pixels;
}

describe("scaleRgbaPixels", () => {
  it("agranda 2x2 a 4x4 duplicando cada píxel en un bloque de 2x2 (vecino más cercano exacto)", () => {
    const { pixels, width, height } = scaleRgbaPixels(build2x2Pixels(), 2, 2, 4, 4);

    expect(width).toBe(4);
    expect(height).toBe(4);

    function rAt(x: number, y: number): number {
      return pixels[(y * width + x) * 4]!;
    }

    expect(rAt(0, 0)).toBe(1);
    expect(rAt(1, 0)).toBe(1);
    expect(rAt(2, 0)).toBe(2);
    expect(rAt(3, 0)).toBe(2);
    expect(rAt(0, 2)).toBe(3);
    expect(rAt(2, 2)).toBe(4);
    expect(rAt(3, 3)).toBe(4);
  });

  it("achica 4x4 a 2x2 tomando una muestra por bloque", () => {
    const pixels = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i += 1) {
      pixels[i * 4] = i + 1;
    }

    const result = scaleRgbaPixels(pixels, 4, 4, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.pixels.length).toBe(2 * 2 * 4);
  });

  it("funciona con 1x1 -> 1x1 (identidad)", () => {
    const pixels = new Uint8Array([10, 20, 30, 40]);

    const result = scaleRgbaPixels(pixels, 1, 1, 1, 1);

    expect(Array.from(result.pixels)).toEqual([10, 20, 30, 40]);
  });
});
