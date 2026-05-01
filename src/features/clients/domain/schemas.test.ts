import { describe, expect, it } from "@jest/globals";

import {
  createClientSchema,
  upsertCamisaSchema,
  upsertPantalonSchema,
} from "./schemas";

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

  describe("upsertCamisaSchema", () => {
    const validClientId = "11111111-1111-4111-8111-111111111111";

    it("accepts all fields empty (only clientId required)", () => {
      const result = upsertCamisaSchema.safeParse({ clientId: validClientId });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.clientId).toBe(validClientId);
      expect(result.data.notes ?? null).toBe(null);
    });

    it("converts empty strings to null and parses comma decimals", () => {
      const result = upsertCamisaSchema.safeParse({
        clientId: validClientId,
        espalda: "",
        hombro: "  ",
        pecho: "92,5",
        cintura: "70.5",
        notes: "  Cliente nuevo  ",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.espalda).toBe(null);
      expect(result.data.hombro).toBe(null);
      expect(result.data.pecho).toBe(92.5);
      expect(result.data.cintura).toBe(70.5);
      expect(result.data.notes).toBe("Cliente nuevo");
    });

    it("fails when a measurement field is out of range", () => {
      const result = upsertCamisaSchema.safeParse({
        clientId: validClientId,
        pecho: 9999,
      });

      expect(result.success).toBe(false);
    });

    it("fails when clientId is not a uuid", () => {
      const result = upsertCamisaSchema.safeParse({
        clientId: "not-uuid",
        pecho: 90,
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.flatten().fieldErrors.clientId?.[0]).toBe(
        "El cliente es inválido",
      );
    });

    it("fails when a measurement value is negative", () => {
      const result = upsertCamisaSchema.safeParse({
        clientId: validClientId,
        espalda: -5,
      });

      expect(result.success).toBe(false);
    });

    it("accepts boundary value 300 and normalizes empty notes to null", () => {
      const result = upsertCamisaSchema.safeParse({
        clientId: validClientId,
        pecho: 300,
        notes: "   ",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.pecho).toBe(300);
      expect(result.data.notes ?? null).toBe(null);
    });
  });

  describe("upsertPantalonSchema", () => {
    const validClientId = "11111111-1111-4111-8111-111111111111";

    it("accepts all fields empty", () => {
      const result = upsertPantalonSchema.safeParse({
        clientId: validClientId,
      });

      expect(result.success).toBe(true);
    });

    it("converts empty strings to null and parses valid values", () => {
      const result = upsertPantalonSchema.safeParse({
        clientId: validClientId,
        largo: "100",
        cintura: "",
        tiro: "30,5",
        notes: "",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.largo).toBe(100);
      expect(result.data.cintura).toBe(null);
      expect(result.data.tiro).toBe(30.5);
      expect(result.data.notes ?? null).toBe(null);
    });

    it("fails when a measurement is over 300", () => {
      const result = upsertPantalonSchema.safeParse({
        clientId: validClientId,
        largo: 301,
      });

      expect(result.success).toBe(false);
    });

    it("accepts boundary value 300 and decimal comma coercion", () => {
      const result = upsertPantalonSchema.safeParse({
        clientId: validClientId,
        largo: "300",
        tiro: "30,5",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.largo).toBe(300);
      expect(result.data.tiro).toBe(30.5);
    });
  });
});
