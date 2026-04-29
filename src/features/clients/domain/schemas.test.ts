import { describe, expect, it } from "@jest/globals";

import { addMeasurementSchema, createClientSchema } from "./schemas";

describe("clients schemas", () => {
  describe("createClientSchema", () => {
    it("trims and parses valid client input", () => {
      const parsed = createClientSchema.parse({
        firstName: "  Ana  ",
        lastName: "  Torres  ",
        phone: " 3001234567 ",
        notes: "  Cliente frecuente  ",
      });

      expect(parsed).toEqual({
        firstName: "Ana",
        lastName: "Torres",
        phone: "3001234567",
        notes: "Cliente frecuente",
      });
    });

    it("returns expected error when first name is empty", () => {
      const result = createClientSchema.safeParse({
        firstName: "   ",
        lastName: "Torres",
        phone: "3001234567",
        notes: "",
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe(
        "El nombre es obligatorio",
      );
    });
  });

  describe("addMeasurementSchema", () => {
    it("coerces comma decimal strings into numbers", () => {
      const parsed = addMeasurementSchema.parse({
        clientId: "11111111-1111-4111-8111-111111111111",
        measuredAt: "2026-04-28T10:00:00.000Z",
        pechoCm: "92,5",
        cinturaCm: "70.5",
        caderaCm: "95",
        largoCm: "115",
        notes: "  Ajustar molde  ",
      });

      expect(parsed.pechoCm).toBe(92.5);
      expect(parsed.cinturaCm).toBe(70.5);
      expect(parsed.caderaCm).toBe(95);
      expect(parsed.largoCm).toBe(115);
      expect(parsed.notes).toBe("Ajustar molde");
    });

    it("fails when clientId is not a uuid", () => {
      const result = addMeasurementSchema.safeParse({
        clientId: "not-uuid",
        measuredAt: "2026-04-28T10:00:00.000Z",
        pechoCm: 90,
        cinturaCm: 70,
        caderaCm: 95,
        largoCm: 110,
        notes: "",
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.flatten().fieldErrors.clientId?.[0]).toBe(
        "El cliente es inválido",
      );
    });

    it("fails when measuredAt does not include timezone", () => {
      const result = addMeasurementSchema.safeParse({
        clientId: "11111111-1111-4111-8111-111111111111",
        measuredAt: "2026-04-28T10:00:00",
        pechoCm: 90,
        cinturaCm: 70,
        caderaCm: 95,
        largoCm: 110,
        notes: "",
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.flatten().fieldErrors.measuredAt?.[0]).toBe(
        "La fecha debe estar en formato ISO 8601 con zona horaria",
      );
    });
  });
});
