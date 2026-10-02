import { describe, expect, it } from "@jest/globals";

import { buildTsplTextTestJob } from "./tsplTextTestJob";
import type { PaperSize } from "./paperSize";

const PAPER: PaperSize = { widthMm: 50, heightMm: 70 };

describe("buildTsplTextTestJob", () => {
  it("arma SIZE/GAP/CLS/TEXT/PRINT con las medidas y líneas dadas (caso feliz)", () => {
    const job = buildTsplTextTestJob(["Prueba", "Linea 2"], PAPER);

    const text = Array.from(job)
      .map((byte) => String.fromCharCode(byte))
      .join("");

    expect(text).toBe(
      [
        "SIZE 50 mm,70 mm",
        "GAP 2 mm,0 mm",
        "CLS",
        'TEXT 10,10,"3",0,1,1,"Prueba"',
        'TEXT 10,40,"3",0,1,1,"Linea 2"',
        "PRINT 1",
        "",
      ].join("\r\n"),
    );
  });

  it("usa widthMm como alto cuando el papel no trae heightMm, y produce un script válido sin líneas", () => {
    const job = buildTsplTextTestJob([], { widthMm: 50 });

    const text = Array.from(job)
      .map((byte) => String.fromCharCode(byte))
      .join("");

    expect(text).toBe(["SIZE 50 mm,50 mm", "GAP 2 mm,0 mm", "CLS", "PRINT 1", ""].join("\r\n"));
  });
});
