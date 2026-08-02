import { describe, expect, it } from "@jest/globals";

import { createScheduleSchema, updateScheduleSchema } from "./schemas";

const VALID_CLIENT_ID = "11111111-1111-4111-8111-111111111111";

const validInput = {
  date: "2026-08-10",
  time: "14:30",
  clientId: VALID_CLIENT_ID,
  notes: "  Ajuste de traje  ",
  status: "pending" as const,
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

    it("rejects an invalid status", () => {
      const result = createScheduleSchema.safeParse({
        ...validInput,
        status: "on_hold",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateScheduleSchema", () => {
    it("accepts a partial update with a single field", () => {
      const result = updateScheduleSchema.safeParse({ status: "confirmed" });

      expect(result.success).toBe(true);
    });

    it("accepts an empty object", () => {
      const result = updateScheduleSchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });
});
