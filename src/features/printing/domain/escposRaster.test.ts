import { describe, expect, it } from "@jest/globals";

import { buildEscPosLabelJob, buildEscPosTextTestJob } from "./escposRaster";
import type { MonochromeBitmap } from "./types";

describe("buildEscPosLabelJob", () => {
  it("arma ESC @ + GS v 0 con el header correcto y los datos del bitmap (caso feliz)", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 1,
      bytesPerRow: 1,
      data: new Uint8Array([0b1010_1010]),
    };

    const job = buildEscPosLabelJob(bitmap);

    expect(Array.from(job)).toEqual([
      0x1b, 0x40, // ESC @
      0x1d, 0x76, 0x30, 0x00, // GS v 0, m=0
      0x01, 0x00, // xL xH (bytesPerRow = 1)
      0x01, 0x00, // yL yH (height = 1)
      0b1010_1010, // dato del bitmap
      0x1d, 0x56, 0x42, 0x00, // GS V corte parcial
    ]);
  });

  it("codifica bytesPerRow y height mayores a 255 en little-endian de 16 bits", () => {
    const bytesPerRow = 300; // > 255, ejercita xH != 0
    const height = 260; // > 255, ejercita yH != 0
    const bitmap: MonochromeBitmap = {
      width: bytesPerRow * 8,
      height,
      bytesPerRow,
      data: new Uint8Array(bytesPerRow * height),
    };

    const job = buildEscPosLabelJob(bitmap);

    // Header empieza después de ESC_INIT (2 bytes) + GS v 0 m (4 bytes)
    const xL = job[6];
    const xH = job[7];
    const yL = job[8];
    const yH = job[9];

    expect(xL | (xH << 8)).toBe(bytesPerRow);
    expect(yL | (yH << 8)).toBe(height);
  });

  it("produce un job vacío de datos cuando el bitmap no tiene bytes (ancho/alto cero)", () => {
    const bitmap: MonochromeBitmap = {
      width: 0,
      height: 0,
      bytesPerRow: 0,
      data: new Uint8Array(0),
    };

    const job = buildEscPosLabelJob(bitmap);

    // ESC_INIT (2) + header (8) + data (0) + corte (4) = 14
    expect(job).toHaveLength(14);
  });

  it("respeta el tamaño total = ESC_INIT + header + data + corte", () => {
    const bitmap: MonochromeBitmap = {
      width: 16,
      height: 2,
      bytesPerRow: 2,
      data: new Uint8Array([0xff, 0x00, 0x00, 0xff]),
    };

    const job = buildEscPosLabelJob(bitmap);

    expect(job).toHaveLength(2 + 8 + 4 + 4);
  });
});

describe("buildEscPosTextTestJob", () => {
  it("arma ESC @ + texto ASCII + corte, sin comando ráster (caso feliz)", () => {
    const job = buildEscPosTextTestJob(["Prueba", "Linea 2"]);

    const expectedText = "Prueba\nLinea 2\n\n";
    const expectedBytes = [
      0x1b, 0x40, // ESC @
      ...Array.from(expectedText).map((char) => char.charCodeAt(0)),
      0x1d, 0x56, 0x42, 0x00, // GS V corte parcial
    ];

    expect(Array.from(job)).toEqual(expectedBytes);
  });

  it("produce solo ESC_INIT + corte cuando no hay líneas", () => {
    const job = buildEscPosTextTestJob([]);

    // ESC_INIT (2) + "\n\n" (2) + corte (4) = 8
    expect(job).toHaveLength(8);
  });
});
