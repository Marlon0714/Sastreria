import { describe, expect, it } from "@jest/globals";

import { evaluateDeliveryGuard } from "./deliveryGuard";

describe("evaluateDeliveryGuard", () => {
  it("price undefined: falta precio, sin saldo calculable", () => {
    const result = evaluateDeliveryGuard({ price: undefined, abono: undefined });

    expect(result.missingPrice).toBe(true);
    expect(result.saldoPendiente).toBeUndefined();
  });

  it("price 0 y abono 0: falta precio (0 no es un precio cargado), saldo pendiente 0", () => {
    const result = evaluateDeliveryGuard({ price: 0, abono: 0 });

    expect(result.missingPrice).toBe(true);
    expect(result.saldoPendiente).toBe(0);
  });

  it("price>0 sin abono: no falta precio, saldo pendiente = price", () => {
    const result = evaluateDeliveryGuard({ price: 50000, abono: undefined });

    expect(result.missingPrice).toBe(false);
    expect(result.saldoPendiente).toBe(50000);
  });

  it("price === abono: no falta precio, saldo pendiente 0", () => {
    const result = evaluateDeliveryGuard({ price: 50000, abono: 50000 });

    expect(result.missingPrice).toBe(false);
    expect(result.saldoPendiente).toBe(0);
  });
});
