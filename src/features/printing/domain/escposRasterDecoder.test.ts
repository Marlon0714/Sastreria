import { describe, expect, it } from "@jest/globals";

import { buildEscPosLabelJob } from "./escposRaster";
import { decodeEscPosLabelJob, EscPosJobFormatError } from "./escposRasterDecoder";
import type { MonochromeBitmap } from "./types";

describe("decodeEscPosLabelJob", () => {
  it("hace round-trip con el caso feliz (8x1)", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 1,
      bytesPerRow: 1,
      data: new Uint8Array([0b1010_1010]),
    };

    const decoded = decodeEscPosLabelJob(buildEscPosLabelJob(bitmap));

    expect(decoded).toEqual(bitmap);
  });

  it("hace round-trip con bytesPerRow/height > 255 (ejercita el byte alto)", () => {
    const bytesPerRow = 300;
    const height = 260;
    const bitmap: MonochromeBitmap = {
      width: bytesPerRow * 8,
      height,
      bytesPerRow,
      data: new Uint8Array(bytesPerRow * height).map((_, index) => index % 256),
    };

    const decoded = decodeEscPosLabelJob(buildEscPosLabelJob(bitmap));

    expect(decoded.width).toBe(bitmap.width);
    expect(decoded.height).toBe(bitmap.height);
    expect(decoded.bytesPerRow).toBe(bitmap.bytesPerRow);
    expect(Array.from(decoded.data)).toEqual(Array.from(bitmap.data));
  });

  it("hace round-trip con un bitmap vacío (ancho/alto cero)", () => {
    const bitmap: MonochromeBitmap = {
      width: 0,
      height: 0,
      bytesPerRow: 0,
      data: new Uint8Array(0),
    };

    const decoded = decodeEscPosLabelJob(buildEscPosLabelJob(bitmap));

    expect(decoded).toEqual(bitmap);
  });

  it("lanza EscPosJobFormatError si el job es más corto que el mínimo", () => {
    const tooShort = new Uint8Array([0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00]);

    expect(() => decodeEscPosLabelJob(tooShort)).toThrow(EscPosJobFormatError);
  });

  it("lanza EscPosJobFormatError si ESC_INIT está corrupto", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 1,
      bytesPerRow: 1,
      data: new Uint8Array([0xff]),
    };
    const job = buildEscPosLabelJob(bitmap);
    job[0] = 0x00;

    expect(() => decodeEscPosLabelJob(job)).toThrow(EscPosJobFormatError);
  });

  it("lanza EscPosJobFormatError si el header GS v 0 está corrupto", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 1,
      bytesPerRow: 1,
      data: new Uint8Array([0xff]),
    };
    const job = buildEscPosLabelJob(bitmap);
    job[4] = 0x01; // m != 0

    expect(() => decodeEscPosLabelJob(job)).toThrow(EscPosJobFormatError);
  });

  it("lanza EscPosJobFormatError si el job quedó truncado a mitad de los datos ráster", () => {
    const bitmap: MonochromeBitmap = {
      width: 16,
      height: 2,
      bytesPerRow: 2,
      data: new Uint8Array([0xff, 0x00, 0x00, 0xff]),
    };
    const job = buildEscPosLabelJob(bitmap);
    const truncated = job.slice(0, job.length - 2);

    expect(() => decodeEscPosLabelJob(truncated)).toThrow(EscPosJobFormatError);
  });

  it("lanza EscPosJobFormatError si el job tiene bytes sobrantes al final", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 1,
      bytesPerRow: 1,
      data: new Uint8Array([0xff]),
    };
    const job = buildEscPosLabelJob(bitmap);
    const withExtra = new Uint8Array([...job, 0x00, 0x00]);

    expect(() => decodeEscPosLabelJob(withExtra)).toThrow(EscPosJobFormatError);
  });
});
