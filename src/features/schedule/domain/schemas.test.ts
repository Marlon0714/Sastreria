import { describe, expect, it } from "@jest/globals";

import { createScheduleSchema, updateScheduleSchema } from "./schemas";

const VALID_CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_OPERARIO_ID = "33333333-3333-4333-8333-333333333333";

const validInput = {
  date: "2026-08-10",
  time: "14:30",
  clientId: VALID_CLIENT_ID,
  price: 15000,
  operarioId: VALID_OPERARIO_ID,
  notes: "  Ajuste de traje  ",
};

describe("schedule schemas", () => {
  describe("createScheduleSchema", () => {
    it("parses valid input and trims notes", () => {
      const result = createScheduleSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.notes).toBe("Ajuste de traje");
    });

    it("accepts a missing notes field", () => {
      const { notes: _notes, ...rest } = validInput;
      const result = createScheduleSchema.safeParse(rest);

      expect(result.success).toBe(true);
    });

    it("accepts an empty date and time (opcionales)", () => {
      const result = createScheduleSchema.safeParse({
        clientId: VALID_CLIENT_ID,
        date: "",
        time: "",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.date).toBeUndefined();
      expect(result.data.time).toBeUndefined();
    });

    it("accepts missing date/time/price/operarioId entirely", () => {
      const result = createScheduleSchema.safeParse({
        clientId: VALID_CLIENT_ID,
      });

      expect(result.success).toBe(true);
    });

    it("rejects an invalid date format", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        date: "10-08-2026",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.date?.[0]).toBe(
        "La fecha debe tener el formato AAAA-MM-DD",
      );
    });

    it("rejects an invalid time format", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        time: "2:30 PM",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.time?.[0]).toBe(
        "La hora debe tener el formato HH:MM",
      );
    });

    it("rejects an invalid clientId", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        clientId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.clientId?.[0]).toBe(
        "El cliente es inválido",
      );
    });

    it("rejects a negative price", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        price: -100,
      });

      expect(result.success).toBe(false);
    });

    it("rejects an invalid operarioId", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        operarioId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
    });

    it("acepta un abono válido, menor o igual al precio", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        abono: 5000,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.abono).toBe(5000);
    });

    it("rechaza un abono negativo", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        abono: -100,
      });

      expect(result.success).toBe(false);
    });

    it("rechaza un abono mayor que el precio", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        price: 15000,
        abono: 20000,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.abono?.[0]).toBe(
        "El abono no puede ser mayor que el precio",
      );
    });

    it("formatea el nombre sin registrar con la primera letra en mayúscula", () => {
      const result = createScheduleSchema.safeParse({
        unregisteredClientName: "pedro RAMÍREZ",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.unregisteredClientName).toBe("Pedro Ramírez");
    });
  });

  describe("updateScheduleSchema", () => {
    it("accepts a partial update with a single field", () => {
      const result = updateScheduleSchema.safeParse({ price: 20000 });

      expect(result.success).toBe(true);
    });

    it("accepts an empty object", () => {
      const result = updateScheduleSchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });
});
