import { describe, expect, it } from "@jest/globals";

import { computeSaldo } from "./saldo";

describe("computeSaldo", () => {
  it("resta el abono del precio", () => {
    expect(computeSaldo({ price: 100000, abono: 30000 })).toBe(70000);
  });

  it("trata un abono ausente como cero", () => {
    expect(computeSaldo({ price: 100000, abono: undefined })).toBe(100000);
  });

  it("devuelve undefined si no hay precio", () => {
    expect(computeSaldo({ price: undefined, abono: 30000 })).toBeUndefined();
  });

  it("permite un saldo de cero cuando el abono cubre todo el precio", () => {
    expect(computeSaldo({ price: 50000, abono: 50000 })).toBe(0);
  });
});
