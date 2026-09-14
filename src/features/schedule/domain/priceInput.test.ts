import { describe, expect, it } from "@jest/globals";

import { parseDigitsOnlyAmount } from "./priceInput";

describe("parseDigitsOnlyAmount", () => {
  it("parsea un texto de solo dígitos a number", () => {
    expect(parseDigitsOnlyAmount("15000")).toBe(15000);
  });

  it("descarta cualquier carácter que no sea dígito", () => {
    expect(parseDigitsOnlyAmount("15.000")).toBe(15000);
    expect(parseDigitsOnlyAmount("$15,000")).toBe(15000);
    expect(parseDigitsOnlyAmount("abc123def")).toBe(123);
  });

  it("devuelve undefined para un texto vacío", () => {
    expect(parseDigitsOnlyAmount("")).toBeUndefined();
  });

  it("devuelve undefined cuando no queda ningún dígito tras filtrar", () => {
    expect(parseDigitsOnlyAmount("abc")).toBeUndefined();
  });

  it("preserva un valor de cero explícito (no lo trata como vacío)", () => {
    expect(parseDigitsOnlyAmount("0")).toBe(0);
  });
});
