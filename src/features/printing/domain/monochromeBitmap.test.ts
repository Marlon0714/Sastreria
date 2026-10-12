import { describe, expect, it } from "@jest/globals";

import {
  invertMonochromeBitmap,
  toMonochromeBitmap,
} from "./monochromeBitmap";

function rgba(r: number, g: number, b: number, a = 255): [number, number, number, number] {
  return [r, g, b, a];
}

describe("toMonochromeBitmap", () => {
  it("empaqueta una fila de 8 píxeles blancos como un byte en 0 (caso feliz)", () => {
    const pixels = new Uint8Array(8 * 4);
    for (let i = 0; i < 8; i += 1) {
      pixels.set(rgba(255, 255, 255), i * 4);
    }

    const bitmap = toMonochromeBitmap(pixels, 8, 1);

    expect(bitmap.width).toBe(8);
    expect(bitmap.height).toBe(1);
    expect(bitmap.bytesPerRow).toBe(1);
    expect(bitmap.data).toEqual(new Uint8Array([0x00]));
  });

  describe("invertMonochromeBitmap", () => {
    it("invierte solo los píxeles de la etiqueta y deja en blanco el padding del último byte", () => {
      const bitmap = {
        width: 3,
        height: 1,
        bytesPerRow: 1,
        data: new Uint8Array([0b1000_0000]),
      };

      const inverted = invertMonochromeBitmap(bitmap);

      expect(inverted.data).toEqual(new Uint8Array([0b0110_0000]));
      expect(bitmap.data).toEqual(new Uint8Array([0b1000_0000]));
    });
  });

  it("marca el bit MSB en 1 cuando el primer píxel de la fila es negro", () => {
    const pixels = new Uint8Array(8 * 4);
    for (let i = 0; i < 8; i += 1) {
      pixels.set(rgba(255, 255, 255), i * 4);
    }
    pixels.set(rgba(0, 0, 0), 0);

    const bitmap = toMonochromeBitmap(pixels, 8, 1);

    expect(bitmap.data).toEqual(new Uint8Array([0b1000_0000]));
  });

  it("redondea bytesPerRow hacia arriba cuando el ancho no es múltiplo de 8", () => {
    const width = 10;
    const pixels = new Uint8Array(width * 4);
    for (let i = 0; i < width; i += 1) {
      pixels.set(rgba(255, 255, 255), i * 4);
    }

    const bitmap = toMonochromeBitmap(pixels, width, 1);

    expect(bitmap.bytesPerRow).toBe(2);
    expect(bitmap.data).toHaveLength(2);
  });

  it("trata un píxel transparente como blanco aunque su color sea oscuro", () => {
    const pixels = new Uint8Array(8 * 4);
    for (let i = 0; i < 8; i += 1) {
      pixels.set(rgba(255, 255, 255), i * 4);
    }
    pixels.set(rgba(0, 0, 0, 0), 0);

    const bitmap = toMonochromeBitmap(pixels, 8, 1);

    expect(bitmap.data).toEqual(new Uint8Array([0x00]));
  });
});
