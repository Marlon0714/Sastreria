import { describe, expect, it } from "@jest/globals";

import {
  MAX_CUSTOM_RANGE_DAYS,
  computeRangeForMode,
  isCurrentPeriod,
  shiftAnchorForMode,
  validateCustomRange,
} from "./periodRange";

describe("computeRangeForMode", () => {
  it("modo 'dia' retorna un rango de un solo día (start === end)", () => {
    expect(computeRangeForMode("dia", "2026-08-15", {})).toEqual({
      startDate: "2026-08-15",
      endDate: "2026-08-15",
    });
  });

  it("modo 'semana' retorna la semana lunes-domingo que contiene el ancla", () => {
    expect(computeRangeForMode("semana", "2026-08-12", {})).toEqual({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("modo 'mes' retorna el mes completo que contiene el ancla, incluyendo febrero de 29 días", () => {
    expect(computeRangeForMode("mes", "2028-02-10", {})).toEqual({
      startDate: "2028-02-01",
      endDate: "2028-02-29",
    });
  });

  it("modo 'rango' retorna null si falta la fecha de inicio", () => {
    expect(
      computeRangeForMode("rango", "2026-08-15", { endDate: "2026-08-20" }),
    ).toBeNull();
  });

  it("modo 'rango' retorna null si falta la fecha de fin", () => {
    expect(
      computeRangeForMode("rango", "2026-08-15", { startDate: "2026-08-10" }),
    ).toBeNull();
  });

  it("modo 'rango' retorna null si el rango es inválido (fin < inicio)", () => {
    expect(
      computeRangeForMode("rango", "2026-08-15", {
        startDate: "2026-08-20",
        endDate: "2026-08-10",
      }),
    ).toBeNull();
  });

  it("modo 'rango' retorna el rango cuando ambas fechas son válidas", () => {
    expect(
      computeRangeForMode("rango", "2026-08-15", {
        startDate: "2026-08-10",
        endDate: "2026-08-20",
      }),
    ).toEqual({ startDate: "2026-08-10", endDate: "2026-08-20" });
  });
});

describe("validateCustomRange", () => {
  it("retorna null (sin error) si falta alguna fecha (estado incompleto)", () => {
    expect(validateCustomRange(undefined, "2026-08-20")).toBeNull();
    expect(validateCustomRange("2026-08-10", undefined)).toBeNull();
    expect(validateCustomRange(undefined, undefined)).toBeNull();
  });

  it("retorna un mensaje de error si el rango está invertido", () => {
    const result = validateCustomRange("2026-08-20", "2026-08-10");
    expect(result).not.toBeNull();
  });

  it("acepta un rango de un solo día (start === end)", () => {
    expect(validateCustomRange("2026-08-10", "2026-08-10")).toBeNull();
  });

  it(`retorna un mensaje de error si el rango supera ${MAX_CUSTOM_RANGE_DAYS} días`, () => {
    const result = validateCustomRange("2025-01-01", "2026-06-01");
    expect(result).not.toBeNull();
  });

  it(`acepta un rango de exactamente ${MAX_CUSTOM_RANGE_DAYS} días (2024 es bisiesto)`, () => {
    const result = validateCustomRange("2024-01-01", "2025-01-01");
    expect(result).toBeNull();
  });
});

describe("shiftAnchorForMode", () => {
  it("modo 'dia' desplaza ±1 día", () => {
    expect(shiftAnchorForMode("dia", "2026-08-15", 1)).toBe("2026-08-16");
    expect(shiftAnchorForMode("dia", "2026-08-15", -1)).toBe("2026-08-14");
  });

  it("modo 'semana' desplaza ±7 días", () => {
    expect(shiftAnchorForMode("semana", "2026-08-15", 1)).toBe("2026-08-22");
    expect(shiftAnchorForMode("semana", "2026-08-15", -1)).toBe("2026-08-08");
  });

  it("modo 'mes' desplaza ±1 mes, normalizado a día 1", () => {
    expect(shiftAnchorForMode("mes", "2026-01-31", 1)).toBe("2026-02-01");
  });

  it("modo 'mes' cruza de año correctamente", () => {
    expect(shiftAnchorForMode("mes", "2026-12-01", 1)).toBe("2027-01-01");
  });

  it("modo 'rango' no cambia el ancla (no hay noción de siguiente/anterior)", () => {
    expect(shiftAnchorForMode("rango", "2026-08-15", 1)).toBe("2026-08-15");
  });
});

describe("isCurrentPeriod", () => {
  it("modo 'dia': true solo si el ancla es hoy", () => {
    expect(isCurrentPeriod("dia", "2026-08-15", "2026-08-15")).toBe(true);
    expect(isCurrentPeriod("dia", "2026-08-14", "2026-08-15")).toBe(false);
  });

  it("modo 'semana': true si hoy cae dentro de la semana del ancla", () => {
    expect(isCurrentPeriod("semana", "2026-08-10", "2026-08-15")).toBe(true);
    expect(isCurrentPeriod("semana", "2026-08-01", "2026-08-15")).toBe(false);
  });

  it("modo 'mes': true si hoy cae dentro del mes del ancla, en fin de año", () => {
    expect(isCurrentPeriod("mes", "2026-12-05", "2026-12-31")).toBe(true);
    expect(isCurrentPeriod("mes", "2026-11-05", "2026-12-31")).toBe(false);
  });

  it("modo 'rango': siempre true (no se ofrece atajo en este modo)", () => {
    expect(isCurrentPeriod("rango", "2026-08-15", "2026-08-15")).toBe(true);
  });
});
