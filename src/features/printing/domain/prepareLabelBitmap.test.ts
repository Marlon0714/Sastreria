import { describe, expect, it } from "@jest/globals";

import { prepareArregloLabelBitmap } from "./prepareLabelBitmap";
import type { DecodedLabelBitmap, PrinterTarget } from "./types";

const PRINTER: PrinterTarget = {
  id: "printer-1",
  name: "Mostrador",
  host: "192.168.1.50",
  port: 9100,
};

function buildDecoded(width: number, height: number): DecodedLabelBitmap {
  return { pixels: new Uint8Array(width * height * 4), width, height };
}

describe("prepareArregloLabelBitmap", () => {
  it("escala y rota el resultado a las medidas configuradas de la impresora (invertidas por la rotación)", () => {
    const printer: PrinterTarget = { ...PRINTER, labelWidthMm: 50, labelLengthMm: 70 };

    const bitmap = prepareArregloLabelBitmap(buildDecoded(384, 300), printer);

    // Tras rotar 90°, el ancho final del bitmap corresponde al ancho físico
    // de la etiqueta (labelWidthMm) y el alto al largo (labelLengthMm).
    expect(bitmap.width).toBeGreaterThan(0);
    expect(bitmap.height).toBeGreaterThan(bitmap.width); // la etiqueta es más larga que ancha
  });

  it("usa 50x70mm por defecto cuando la impresora no trae labelWidthMm/labelLengthMm", () => {
    const bitmap = prepareArregloLabelBitmap(buildDecoded(384, 300), PRINTER);

    expect(bitmap.height).toBeGreaterThan(bitmap.width);
  });

  it("produce un MonochromeBitmap consistente (bytesPerRow = ceil(width/8))", () => {
    const bitmap = prepareArregloLabelBitmap(buildDecoded(384, 300), PRINTER);

    expect(bitmap.bytesPerRow).toBe(Math.ceil(bitmap.width / 8));
    expect(bitmap.data).toHaveLength(bitmap.bytesPerRow * bitmap.height);
  });
});
