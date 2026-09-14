import { describe, expect, it } from "@jest/globals";

import { findUnfinishedScheduleByClient } from "./unfinishedScheduleCheck";
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
    clientId: "client-1",
    ...overrides,
  };
}

describe("findUnfinishedScheduleByClient", () => {
  it('encuentra un turno "pendiente"', () => {
    const other = makeSchedule({ id: "s-1", status: "pendiente" });

    expect(findUnfinishedScheduleByClient([other], undefined)).toBe(other);
  });

  it('encuentra un turno "agendado"', () => {
    const other = makeSchedule({ id: "s-1", status: "agendado" });

    expect(findUnfinishedScheduleByClient([other], undefined)).toBe(other);
  });

  it('encuentra un turno "en_proceso"', () => {
    const other = makeSchedule({ id: "s-1", status: "en_proceso" });

    expect(findUnfinishedScheduleByClient([other], undefined)).toBe(other);
  });

  it('ignora turnos "listo_para_entregar"', () => {
    const other = makeSchedule({ id: "s-1", status: "listo_para_entregar" });

    expect(findUnfinishedScheduleByClient([other], undefined)).toBeNull();
  });

  it('ignora turnos "entregado"', () => {
    const other = makeSchedule({ id: "s-1", status: "entregado" });

    expect(findUnfinishedScheduleByClient([other], undefined)).toBeNull();
  });

  it("excluye excludeId aunque esté sin terminar", () => {
    const self = makeSchedule({ id: "s-1", status: "agendado" });

    expect(findUnfinishedScheduleByClient([self], "s-1")).toBeNull();
  });

  it("lista vacía devuelve null", () => {
    expect(findUnfinishedScheduleByClient([], undefined)).toBeNull();
  });

  it("con más de un turno sin terminar, devuelve el primero de la lista tal cual llega (sin reordenar)", () => {
    const first = makeSchedule({ id: "s-1", status: "pendiente" });
    const second = makeSchedule({ id: "s-2", status: "agendado" });

    expect(findUnfinishedScheduleByClient([first, second], undefined)).toBe(
      first,
    );
    // Invertido: el resultado sigue siendo el primero de ESA lista, no el
    // que estaría "primero" según algún criterio propio de la función.
    expect(findUnfinishedScheduleByClient([second, first], undefined)).toBe(
      second,
    );
  });
});
