import { describe, expect, it } from "@jest/globals";

import { buildArregloLabelData } from "./arregloLabelData";

describe("buildArregloLabelData", () => {
  it("arma la etiqueta completa (caso feliz) con nombre, teléfono, fecha y saldo", () => {
    const label = buildArregloLabelData(
      { date: "2026-09-30", price: 50000, abono: 20000 },
      { name: "Ana Torres", phone: "3001234567" },
    );

    expect(label).toEqual({
      clientName: "Ana Torres",
      clientPhone: "3001234567",
      date: "2026-09-30",
      price: 50000,
      saldo: 30000,
    });
  });

  it("deja clientPhone undefined cuando el cliente no tiene teléfono", () => {
    const label = buildArregloLabelData(
      { date: "2026-09-30", price: 50000, abono: 0 },
      { name: "Ana Torres" },
    );

    expect(label.clientPhone).toBeUndefined();
  });

  it("deja price y saldo undefined cuando el turno no tiene precio ni abono", () => {
    const label = buildArregloLabelData(
      { date: "2026-09-30", price: undefined, abono: undefined },
      { name: "Ana Torres", phone: "3001234567" },
    );

    expect(label.price).toBeUndefined();
    expect(label.saldo).toBeUndefined();
  });

  it("calcula saldo en cero cuando el abono cubre exactamente el precio", () => {
    const label = buildArregloLabelData(
      { date: "2026-09-30", price: 40000, abono: 40000 },
      { name: "Ana Torres", phone: "3001234567" },
    );

    expect(label.saldo).toBe(0);
  });
});
