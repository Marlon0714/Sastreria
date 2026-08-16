import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  formatDateForDisplay,
  formatDateString,
  getWeekDates,
  localDateFromIso,
  shiftDateString,
  todayDateString,
} from "./dateUtils";

describe("dateUtils", () => {
  describe("formatDateString", () => {
    it("formatea con ceros a la izquierda", () => {
      expect(formatDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
  });

  describe("shiftDateString", () => {
    it("suma días dentro del mismo mes", () => {
      expect(shiftDateString("2026-08-10", 1)).toBe("2026-08-11");
    });

    it("resta días cruzando el mes anterior", () => {
      expect(shiftDateString("2026-08-01", -1)).toBe("2026-07-31");
    });

    it("suma días cruzando a un nuevo año", () => {
      expect(shiftDateString("2026-12-31", 1)).toBe("2027-01-01");
    });
  });

  describe("todayDateString", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 7, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("retorna la fecha de hoy formateada", () => {
      expect(todayDateString()).toBe("2026-08-15");
    });
  });

  describe("localDateFromIso", () => {
    it("extrae la fecha local (no UTC) del timestamp ISO", () => {
      // Construido con componentes locales (mismo patrón que el resto de
      // este archivo) para que el test no dependa de la zona horaria del
      // entorno que lo corre: da igual el offset, el timestamp ISO
      // resultante siempre representa ese mismo instante local.
      const localMoment = new Date(2026, 7, 15, 23, 30, 0);
      expect(localDateFromIso(localMoment.toISOString())).toBe("2026-08-15");
    });
  });

  describe("getWeekDates", () => {
    it("devuelve las 7 fechas de lunes a domingo cuando la fecha dada es miércoles", () => {
      expect(getWeekDates("2026-08-12")).toEqual([
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-14",
        "2026-08-15",
        "2026-08-16",
      ]);
    });

    it("cuando la fecha dada es domingo, retorna la semana que termina ese domingo", () => {
      expect(getWeekDates("2026-08-16")).toEqual([
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-14",
        "2026-08-15",
        "2026-08-16",
      ]);
    });

    it("cuando la fecha dada es lunes, retorna esa misma semana", () => {
      expect(getWeekDates("2026-08-10")).toEqual([
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-14",
        "2026-08-15",
        "2026-08-16",
      ]);
    });

    it("cruza correctamente el límite de mes", () => {
      expect(getWeekDates("2026-08-31")).toEqual([
        "2026-08-31",
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-05",
        "2026-09-06",
      ]);
    });
  });

  describe("formatDateForDisplay", () => {
    it("incluye día de la semana y mes en español", () => {
      const result = formatDateForDisplay("2026-08-15");
      expect(result).toContain("2026");
      expect(result.toLowerCase()).toContain("agosto");
    });
  });
});
