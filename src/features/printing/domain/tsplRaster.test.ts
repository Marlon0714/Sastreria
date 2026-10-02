import { describe, expect, it } from "@jest/globals";

import { buildTsplBitmapJob } from "./tsplRaster";
import type { MonochromeBitmap } from "./types";

describe("buildTsplBitmapJob", () => {
  it("arma SIZE/GAP/CLS/BITMAP/PRINT con las medidas recuperadas del bitmap (caso feliz)", () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 8,
      bytesPerRow: 1,
      data: new Uint8Array([0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00]),
    };

    const job = buildTsplBitmapJob(bitmap);

    const text = Array.from(job)
      .map((byte) => String.fromCharCode(byte))
      .join("");

    expect(text).toBe(
      [
        "SIZE 1 mm,1 mm",
        "GAP 2 mm,0 mm",
        "CLS",
        "BITMAP 0,0,1,8,0,\xff\x00\xff\x00\xff\x00\xff\x00",
        "PRINT 1",
        "",
      ].join("\r\n"),
    );
  });

  it("respeta el tamaño total = header + datos del bitmap + pie", () => {
    const bitmap: MonochromeBitmap = {
      width: 16,
      height: 2,
      bytesPerRow: 2,
      data: new Uint8Array([0xff, 0x00, 0x00, 0xff]),
    };

    const job = buildTsplBitmapJob(bitmap);

    const headerText = "SIZE 2 mm,0 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nBITMAP 0,0,2,2,0,";
    const footerText = "\r\nPRINT 1\r\n";
    expect(job).toHaveLength(headerText.length + bitmap.data.length + footerText.length);
  });
});
