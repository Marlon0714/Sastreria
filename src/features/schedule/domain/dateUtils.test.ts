import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  formatDateForDisplay,
  formatDateString,
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

  describe("formatDateForDisplay", () => {
    it("incluye día de la semana y mes en español", () => {
      const result = formatDateForDisplay("2026-08-15");
      expect(result).toContain("2026");
      expect(result.toLowerCase()).toContain("agosto");
    });
  });
});
