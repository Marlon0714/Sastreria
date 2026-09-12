import { describe, expect, it } from "@jest/globals";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../../schedule/domain/types";
import {
  buildScheduleListItems,
  resolveScheduleListForBucket,
} from "./scheduleListBucket";

const RANGE = { startDate: "2026-08-10", endDate: "2026-08-16" };
const TODAY = "2026-08-15";

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

function makeClient(overrides: Partial<Client> & { id: string }): Client {
  return {
    firstName: "Ana",
    lastName: "Torres",
    phone: "3000000000",
    notes: null,
    measurements: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

describe("resolveScheduleListForBucket", () => {
  it("bucket 'total': todos los turnos del periodo, ordenados por date/time asc", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-16", time: "09:00" }),
      makeSchedule({ id: "s-2", date: "2026-08-10", time: "15:00" }),
      makeSchedule({ id: "s-3", date: "2026-08-10", time: "08:00" }),
      makeSchedule({ id: "s-fuera", date: "2026-08-20" }),
    ];

    const result = resolveScheduleListForBucket(allSchedules, "total", RANGE, TODAY);

    expect(result.map((s) => s.id)).toEqual(["s-3", "s-2", "s-1"]);
  });

  it("bucket por status ('agendado'): solo los turnos del periodo con ese status", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "en_proceso" }),
      makeSchedule({ id: "s-3", date: "2026-08-12", status: "agendado" }),
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "agendado",
      RANGE,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1", "s-3"]);
  });

  it("bucket 'en_proceso'", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "en_proceso" }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "agendado" }),
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "en_proceso",
      RANGE,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("bucket 'listo_para_entregar'", () => {
    const allSchedules = [
      makeSchedule({
        id: "s-1",
        date: "2026-08-10",
        status: "listo_para_entregar",
      }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "agendado" }),
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "listo_para_entregar",
      RANGE,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("bucket 'entregado'", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "entregado" }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "agendado" }),
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "entregado",
      RANGE,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("bucket 'no_realizado': date < today y status pendiente/agendado, ordenado", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-14", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-3", date: "2026-08-15", status: "agendado" }), // hoy, no cuenta
      makeSchedule({ id: "s-4", date: "2026-08-11", status: "en_proceso" }), // ya avanzó
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "no_realizado",
      RANGE,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-2", "s-1"]);
  });

  it("bucket 'sin_fecha_global': todos los turnos sin date, sin ordenar, ignora el range", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: undefined }),
      makeSchedule({ id: "s-2", date: "2026-08-10" }),
      makeSchedule({ id: "s-3", date: undefined }),
    ];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "sin_fecha_global",
      null,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1", "s-3"]);
  });

  // Ajuste pedido por el usuario tras revisar el plan: el bucket
  // "pendiente" ya NO devuelve siempre [] (aunque
  // `periodStatusCounts.pendiente` sea estructuralmente 0, ver comentario
  // en periodBreakdown.ts) — delega en la misma lista que
  // "sin_fecha_global", para que la tarjeta "Pendientes" navegue a algo
  // útil en vez de a una pantalla siempre vacía.
  it("bucket 'pendiente': devuelve la MISMA lista que 'sin_fecha_global', no []", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: undefined, status: "pendiente" }),
      makeSchedule({ id: "s-2", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-3", date: undefined, status: "pendiente" }),
    ];

    const pendienteResult = resolveScheduleListForBucket(
      allSchedules,
      "pendiente",
      RANGE,
      TODAY,
    );
    const sinFechaGlobalResult = resolveScheduleListForBucket(
      allSchedules,
      "sin_fecha_global",
      RANGE,
      TODAY,
    );

    expect(pendienteResult.map((s) => s.id)).toEqual(["s-1", "s-3"]);
    expect(pendienteResult).toEqual(sinFechaGlobalResult);
  });

  it("bucket 'pendiente' tampoco depende de range: [] o cualquier valor da el mismo resultado", () => {
    const allSchedules = [makeSchedule({ id: "s-1", date: undefined })];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "pendiente",
      null,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });

  it("range: null devuelve [] para los buckets acotados a un periodo", () => {
    const allSchedules = [
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
    ];

    expect(resolveScheduleListForBucket(allSchedules, "total", null, TODAY)).toEqual(
      [],
    );
    expect(
      resolveScheduleListForBucket(allSchedules, "agendado", null, TODAY),
    ).toEqual([]);
    expect(
      resolveScheduleListForBucket(allSchedules, "en_proceso", null, TODAY),
    ).toEqual([]);
    expect(
      resolveScheduleListForBucket(
        allSchedules,
        "listo_para_entregar",
        null,
        TODAY,
      ),
    ).toEqual([]);
    expect(
      resolveScheduleListForBucket(allSchedules, "entregado", null, TODAY),
    ).toEqual([]);
    expect(
      resolveScheduleListForBucket(allSchedules, "no_realizado", null, TODAY),
    ).toEqual([]);
  });

  it("range: null NO afecta 'sin_fecha_global' (bucket global)", () => {
    const allSchedules = [makeSchedule({ id: "s-1", date: undefined })];

    const result = resolveScheduleListForBucket(
      allSchedules,
      "sin_fecha_global",
      null,
      TODAY,
    );

    expect(result.map((s) => s.id)).toEqual(["s-1"]);
  });
});

describe("buildScheduleListItems", () => {
  it("arma { schedule, clientLabel } para cada turno, en el mismo orden recibido", () => {
    const client = makeClient({ id: "client-1", firstName: "Ana", lastName: "Torres" });
    const clientsById = new Map([[client.id, client]]);
    const schedules = [
      makeSchedule({ id: "s-1", clientId: "client-1" }),
      makeSchedule({ id: "s-2", unregisteredClientName: "Juan Pérez" }),
      makeSchedule({ id: "s-3", clientId: "client-borrado" }),
    ];

    const result = buildScheduleListItems(schedules, clientsById);

    expect(result).toEqual([
      { schedule: schedules[0], clientLabel: "Ana Torres" },
      { schedule: schedules[1], clientLabel: "Juan Pérez" },
      { schedule: schedules[2], clientLabel: "Cliente eliminado" },
    ]);
  });
});
