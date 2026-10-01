import { describe, expect, it } from "@jest/globals";

import { mmToDots } from "./paperSize";

describe("mmToDots", () => {
  it("convierte el ancho imprimible real de la etiqueta (48mm a 203dpi) a 384 dots", () => {
    expect(mmToDots(48, 203)).toBe(384);
  });

  it("redondea al dot entero más cercano", () => {
    // 10mm a 203dpi = 79.9212... -> redondea a 80
    expect(mmToDots(10, 203)).toBe(80);
  });

  it("funciona con otro DPI común (300dpi, típico de impresoras de etiquetas de mayor resolución)", () => {
    // 50mm a 300dpi = 590.55... -> redondea a 591
    expect(mmToDots(50, 300)).toBe(591);
  });

  it("retorna 0 para un ancho de 0mm", () => {
    expect(mmToDots(0, 203)).toBe(0);
  });
});
