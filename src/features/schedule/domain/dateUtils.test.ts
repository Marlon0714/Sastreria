import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  formatDateForDisplay,
  formatDateString,
  formatMonthForDisplay,
  formatShortDate,
  formatWeekdayAndMonth,
  getMonthRange,
  getWeekDates,
  localDateFromIso,
  shiftDateString,
  shiftMonthDateString,
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

  describe("formatWeekdayAndMonth", () => {
    it("formatea día de la semana, día y mes sin ceros a la izquierda", () => {
      expect(formatWeekdayAndMonth("2026-08-20")).toBe("Jueves 20 de agosto");
    });

    it("no antepone cero al día cuando es de un solo dígito", () => {
      expect(formatWeekdayAndMonth("2026-08-02")).toBe("Domingo 2 de agosto");
    });

    it("no incluye el año", () => {
      const result = formatWeekdayAndMonth("2026-08-20");
      expect(result).not.toContain("2026");
    });
  });

  describe("getMonthRange", () => {
    it("retorna el primer y último día de un mes de 31 días", () => {
      expect(getMonthRange("2026-08-15")).toEqual({
        startDate: "2026-08-01",
        endDate: "2026-08-31",
      });
    });

    it("retorna el primer y último día de un mes de 30 días", () => {
      expect(getMonthRange("2026-09-15")).toEqual({
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
    });

    it("retorna el primer y último día de febrero en año bisiesto", () => {
      expect(getMonthRange("2028-02-10")).toEqual({
        startDate: "2028-02-01",
        endDate: "2028-02-29",
      });
    });

    it("retorna el primer y último día de febrero en año no bisiesto", () => {
      expect(getMonthRange("2026-02-10")).toEqual({
        startDate: "2026-02-01",
        endDate: "2026-02-28",
      });
    });
  });

  describe("shiftMonthDateString", () => {
    it("suma un mes dentro del mismo año, normalizando al día 1", () => {
      expect(shiftMonthDateString("2026-08-15", 1)).toBe("2026-09-01");
    });

    it("resta un mes cruzando a un año anterior", () => {
      expect(shiftMonthDateString("2026-01-10", -1)).toBe("2025-12-01");
    });

    it("suma un mes cruzando a un año siguiente", () => {
      expect(shiftMonthDateString("2026-12-05", 1)).toBe("2027-01-01");
    });

    it("no se desborda al sumar un mes desde el día 31 de enero", () => {
      expect(shiftMonthDateString("2026-01-31", 1)).toBe("2026-02-01");
    });
  });

  describe("formatMonthForDisplay", () => {
    it("formatea mes capitalizado y año", () => {
      expect(formatMonthForDisplay("2026-09-01")).toBe("Septiembre 2026");
    });

    it("formatea correctamente otro mes/año", () => {
      expect(formatMonthForDisplay("2027-01-15")).toBe("Enero 2027");
    });
  });

  describe("formatShortDate", () => {
    it("formatea día y mes abreviado sin año", () => {
      expect(formatShortDate("2026-09-08")).toBe("8 sep");
    });

    it("no antepone cero al día cuando es de un solo dígito", () => {
      expect(formatShortDate("2026-01-05")).toBe("5 ene");
    });

    it("no incluye el año", () => {
      expect(formatShortDate("2026-09-08")).not.toContain("2026");
    });
  });
});
