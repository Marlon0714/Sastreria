import { describe, expect, it } from "@jest/globals";

import { buildEscPosBitImageJob, buildEscPosLabelJob } from "./escposRaster";
import { resolveLabelRenderer, UnsupportedPrintProtocolError } from "./printRenderer";
import { buildTsplBitmapJob } from "./tsplRaster";
import type { MonochromeBitmap, PrinterTarget, PrintProtocol } from "./types";

const TARGET: PrinterTarget = {
  id: "printer-1",
  name: "Mostrador",
  host: "192.168.1.50",
  port: 9100,
};

const BITMAP: MonochromeBitmap = {
  width: 8,
  height: 1,
  bytesPerRow: 1,
  data: new Uint8Array([0b1010_1010]),
};

describe("resolveLabelRenderer", () => {
  it("resuelve el renderer ESC/POS y produce el mismo job que buildEscPosLabelJob directo", () => {
    const renderer = resolveLabelRenderer("escpos-raster");

    const job = renderer.render(BITMAP, TARGET);

    expect(Array.from(job)).toEqual(Array.from(buildEscPosLabelJob(BITMAP)));
  });

  it("resuelve el renderer bit-image (ESC *) y produce el mismo job que buildEscPosBitImageJob directo", () => {
    const renderer = resolveLabelRenderer("escpos-bitimage");

    const job = renderer.render(BITMAP, TARGET);

    expect(Array.from(job)).toEqual(Array.from(buildEscPosBitImageJob(BITMAP)));
  });

  it("resuelve el renderer TSPL (BITMAP) y produce el mismo job que buildTsplBitmapJob directo", () => {
    const renderer = resolveLabelRenderer("tspl-bitmap");

    const job = renderer.render(BITMAP, TARGET);

    expect(Array.from(job)).toEqual(Array.from(buildTsplBitmapJob(BITMAP)));
  });

  it("lanza UnsupportedPrintProtocolError con un protocolo desconocido", () => {
    const bogusProtocol = "zpl-raster" as PrintProtocol;

    expect(() => resolveLabelRenderer(bogusProtocol)).toThrow(UnsupportedPrintProtocolError);
  });
});
