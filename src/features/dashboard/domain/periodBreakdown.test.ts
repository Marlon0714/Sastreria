import { describe, expect, it } from "@jest/globals";

import type { Schedule } from "../../schedule/domain/types";
import {
  computeGlobalPendingCount,
  computeNotRealizedInPeriod,
  computePeriodMoneyTotals,
  computeStatusCounts,
  countSchedulesByDayOfWeek,
  filterSchedulesInRange,
} from "./periodBreakdown";

const WEEK_DATES = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

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

describe("filterSchedulesInRange", () => {
  it("excluye turnos sin date del recorte", () => {
    const schedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10" }),
      makeSchedule({ id: "s-2", date: undefined }),
    ];

    const result = filterSchedulesInRange(schedules, "2026-08-10", "2026-08-16");

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("excluye turnos con date fuera del rango", () => {
    const schedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10" }),
      makeSchedule({ id: "s-2", date: "2026-08-20" }),
    ];

    const result = filterSchedulesInRange(schedules, "2026-08-10", "2026-08-16");

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("incluye turnos con date igual a los extremos del rango (inclusivo)", () => {
    const schedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10" }),
      makeSchedule({ id: "s-2", date: "2026-08-16" }),
    ];

    const result = filterSchedulesInRange(schedules, "2026-08-10", "2026-08-16");

    expect(result.map((s) => s.id)).toEqual(["s-1", "s-2"]);
  });

  it("funciona con un rango de un solo día", () => {
    const schedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10" }),
      makeSchedule({ id: "s-2", date: "2026-08-11" }),
    ];

    const result = filterSchedulesInRange(schedules, "2026-08-10", "2026-08-10");

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("funciona con un rango que cruza meses", () => {
    const schedules = [
      makeSchedule({ id: "s-1", date: "2026-08-30" }),
      makeSchedule({ id: "s-2", date: "2026-09-02" }),
      makeSchedule({ id: "s-3", date: "2026-09-10" }),
    ];

    const result = filterSchedulesInRange(schedules, "2026-08-25", "2026-09-05");

    expect(result.map((s) => s.id)).toEqual(["s-1", "s-2"]);
  });
});

describe("countSchedulesByDayOfWeek", () => {
  it("cuenta todos los turnos por día (incluyendo 'entregado'), con un día en 0", () => {
    const schedulesInWeek = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-10", status: "entregado" }),
      makeSchedule({ id: "s-3", date: "2026-08-12", status: "en_proceso" }),
    ];

    const result = countSchedulesByDayOfWeek(schedulesInWeek, WEEK_DATES);

    // Lun 10: 2 (s-1 + s-2, entregado incluido); Mar 11: 0; Mié 12: 1; resto 0.
    expect(result).toEqual([2, 0, 1, 0, 0, 0, 0]);
  });

  it("un turno 'entregado' sí se cuenta en el desglose semanal", () => {
    const schedulesInWeek = [
      makeSchedule({ id: "s-1", date: "2026-08-11", status: "entregado" }),
    ];

    const result = countSchedulesByDayOfWeek(schedulesInWeek, WEEK_DATES);

    expect(result).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });
});

describe("computeStatusCounts", () => {
  it("cuenta total y los 5 status; 'pendiente' siempre 0 (turnos con date nunca son 'pendiente')", () => {
    const schedulesInPeriod = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "en_proceso" }),
      makeSchedule({
        id: "s-3",
        date: "2026-08-12",
        status: "listo_para_entregar",
      }),
      makeSchedule({ id: "s-4", date: "2026-08-13", status: "entregado" }),
    ];

    const result = computeStatusCounts(schedulesInPeriod);

    expect(result).toEqual({
      total: 4,
      pendiente: 0,
      agendado: 1,
      en_proceso: 1,
      listo_para_entregar: 1,
      entregado: 1,
    });
  });
});

describe("computePeriodMoneyTotals", () => {
  it("suma price/abono con datos mixtos o ausentes", () => {
    const schedulesInPeriod = [
      makeSchedule({ id: "s-1", price: 10000, abono: 5000 }),
      makeSchedule({ id: "s-2", price: 20000 }), // sin abono
      makeSchedule({ id: "s-3" }), // sin price ni abono
    ];

    const result = computePeriodMoneyTotals(schedulesInPeriod);

    expect(result).toEqual({
      totalPrice: 30000,
      totalAbono: 5000,
      totalSaldoPendiente: 25000,
    });
  });
});

describe("computeNotRealizedInPeriod", () => {
  it("cuenta solo turnos con date < today y status pendiente/agendado", () => {
    const schedulesInPeriod = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-10", status: "en_proceso" }),
    ];

    const result = computeNotRealizedInPeriod(schedulesInPeriod, "2026-08-15");

    expect(result).toBe(1);
  });

  it("date === today con status agendado NO cuenta como no realizado", () => {
    const schedulesInPeriod = [
      makeSchedule({ id: "s-1", date: "2026-08-15", status: "agendado" }),
    ];

    const result = computeNotRealizedInPeriod(schedulesInPeriod, "2026-08-15");

    expect(result).toBe(0);
  });

  it("date en el futuro nunca cuenta como no realizado", () => {
    const schedulesInPeriod = [
      makeSchedule({ id: "s-1", date: "2026-08-20", status: "agendado" }),
    ];

    const result = computeNotRealizedInPeriod(schedulesInPeriod, "2026-08-15");

    expect(result).toBe(0);
  });
});

describe("computeGlobalPendingCount", () => {
  it("cuenta turnos sin fecha, cualquiera sea su status", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: undefined, status: "pendiente" }),
      makeSchedule({ id: "s-2", date: undefined, status: "en_proceso" }),
      makeSchedule({ id: "s-3", date: "2026-08-10", status: "agendado" }),
    ];

    const result = computeGlobalPendingCount(allSchedules);

    expect(result).toBe(2);
  });
});
