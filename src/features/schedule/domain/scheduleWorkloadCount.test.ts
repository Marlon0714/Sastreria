import { describe, expect, it } from "@jest/globals";

import {
  countPendingSchedulesOnDate,
  formatPendingScheduleCountLabel,
} from "./scheduleWorkloadCount";
import type { Schedule } from "./types";

function makeSchedule(overrides: Partial<Schedule> & { id: string }): Schedule {
  return {
    isPriority: false,
    isOwnerFlagged: false,
    category: "arreglo",
    status: "agendado",
    statusLocked: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

describe("countPendingSchedulesOnDate", () => {
  it("excluye los turnos con status 'entregado'", () => {
    const schedules = [
      makeSchedule({ id: "s-1", status: "agendado" }),
      makeSchedule({ id: "s-2", status: "entregado" }),
    ];

    const result = countPendingSchedulesOnDate(schedules, undefined, "arreglo");

    expect(result).toBe(1);
  });

  it("excluye el turno con excludeId (el propio turno en edición)", () => {
    const schedules = [
      makeSchedule({ id: "s-1", status: "agendado" }),
      makeSchedule({ id: "s-2", status: "agendado" }),
    ];

    const result = countPendingSchedulesOnDate(schedules, "s-1", "arreglo");

    expect(result).toBe(1);
  });

  it("incluye turnos en cualquier status distinto de 'entregado' (agendado/en_proceso/listo_para_entregar)", () => {
    const schedules = [
      makeSchedule({ id: "s-1", status: "agendado" }),
      makeSchedule({ id: "s-2", status: "en_proceso" }),
      makeSchedule({ id: "s-3", status: "listo_para_entregar" }),
    ];

    const result = countPendingSchedulesOnDate(schedules, undefined, "arreglo");

    expect(result).toBe(3);
  });

  it("devuelve 0 para una lista vacía", () => {
    const result = countPendingSchedulesOnDate([], undefined, "arreglo");

    expect(result).toBe(0);
  });

  it("no cuenta turnos de una categoría distinta a la solicitada", () => {
    const schedules = [
      makeSchedule({ id: "s-1", category: "confeccion" }),
      makeSchedule({ id: "s-2", category: "confeccion" }),
    ];

    const result = countPendingSchedulesOnDate(schedules, undefined, "arreglo");

    expect(result).toBe(0);
  });

  it("cuenta solo los turnos de la misma categoría cuando hay una mezcla", () => {
    const schedules = [
      makeSchedule({ id: "s-1", category: "arreglo" }),
      makeSchedule({ id: "s-2", category: "confeccion" }),
      makeSchedule({ id: "s-3", category: "arreglo" }),
    ];

    const result = countPendingSchedulesOnDate(schedules, undefined, "arreglo");

    expect(result).toBe(2);
  });
});

describe("formatPendingScheduleCountLabel", () => {
  it("devuelve el texto de cero cuando count es 0", () => {
    expect(formatPendingScheduleCountLabel(0)).toBe(
      "Ningún turno agendado todavía",
    );
  });

  it("devuelve el texto singular cuando count es 1", () => {
    expect(formatPendingScheduleCountLabel(1)).toBe(
      "1 turno ya agendado para este día",
    );
  });

  it("devuelve el texto plural cuando count es mayor a 1", () => {
    expect(formatPendingScheduleCountLabel(3)).toBe(
      "3 turnos ya agendados para este día",
    );
  });
});
