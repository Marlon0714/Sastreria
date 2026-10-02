import { describe, expect, it } from "@jest/globals";

import { buildTsplBitmapJob } from "./tsplRaster";
import type { MonochromeBitmap } from "./types";

describe("buildTsplBitmapJob", () => {
  it("arma SIZE/GAP/CLS/BITMAP/PRINT con las medidas recuperadas del bitmap, invirtiendo la polaridad de bits (caso feliz)", () => {
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

    // Los datos del bitmap salen invertidos (^ 0xff) respecto al original:
    // TSPL usa la polaridad contraria a ESC/POS para el comando BITMAP.
    expect(text).toBe(
      [
        "SIZE 1 mm,1 mm",
        "GAP 2 mm,0 mm",
        "CLS",
        "BITMAP 0,0,1,8,0,\x00\xff\x00\xff\x00\xff\x00\xff",
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
