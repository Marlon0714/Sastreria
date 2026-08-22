import { describe, expect, it } from "@jest/globals";

import { formatPrice } from "./strings";

describe("formatPrice", () => {
  it("formatea un precio positivo con separador de miles", () => {
    expect(formatPrice(10000)).toBe("$10.000");
  });

  it("formatea 0 correctamente", () => {
    expect(formatPrice(0)).toBe("$0");
  });

  it("pone el signo ANTES del símbolo de moneda para negativos", () => {
    expect(formatPrice(-15000)).toBe("-$15.000");
  });

  it("redondea valores decimales antes de formatear", () => {
    expect(formatPrice(15000.6)).toBe("$15.001");
    expect(formatPrice(-15000.6)).toBe("-$15.001");
  });
});
