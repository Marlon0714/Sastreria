import { describe, expect, it } from "@jest/globals";

import { formatPeriodLabel } from "./periodLabel";

describe("formatPeriodLabel", () => {
  it("modo 'dia' reusa formatDateForDisplay (weekday + día + mes + año)", () => {
    const result = formatPeriodLabel("dia", {
      startDate: "2026-08-15",
      endDate: "2026-08-15",
    });
    expect(result).toContain("2026");
    expect(result.toLowerCase()).toContain("agosto");
  });

  it("modo 'semana' arma 'Semana del X al Y'", () => {
    const result = formatPeriodLabel("semana", {
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
    expect(result).toBe("Semana del 10 ago al 16 ago");
  });

  it("modo 'mes' reusa formatMonthForDisplay", () => {
    const result = formatPeriodLabel("mes", {
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(result).toBe("Septiembre 2026");
  });

  it("modo 'rango' arma 'X - Y'", () => {
    const result = formatPeriodLabel("rango", {
      startDate: "2026-08-08",
      endDate: "2026-08-22",
    });
    expect(result).toBe("8 ago - 22 ago");
  });

  it("modo 'rango' con el mismo día en inicio y fin", () => {
    const result = formatPeriodLabel("rango", {
      startDate: "2026-08-08",
      endDate: "2026-08-08",
    });
    expect(result).toBe("8 ago - 8 ago");
  });
});
