import { describe, expect, it } from "@jest/globals";

import {
  findDuplicateScheduleByName,
  type NamedSchedule,
} from "./duplicateCheck";
import type { Schedule } from "./types";

function makeSchedule(overrides: Partial<Schedule> & { id: string }): Schedule {
  return {
    isPriority: false,
    category: "arreglo",
    status: "agendado",
    statusLocked: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

// Resolver por defecto para estos tests: nombre completo si tiene
// clientId (usando un mapa de nombres registrados), o unregisteredClientName.
function makeResolver(clientNames: Record<string, string>) {
  return (item: NamedSchedule): string | undefined =>
    item.clientId ? clientNames[item.clientId] : item.unregisteredClientName;
}

describe("findDuplicateScheduleByName", () => {
  it("encuentra otro turno de la misma fecha con el mismo nombre sin registrar", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      unregisteredClientName: "Pedro Ramírez",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName(
      [other],
      "Pedro Ramírez",
      undefined,
      resolver,
    );

    expect(result).toBe(other);
  });

  it("excluye el propio turno al editar (mismo id) aunque el nombre coincida", () => {
    const self = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      unregisteredClientName: "Pedro Ramírez",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName(
      [self],
      "Pedro Ramírez",
      "s-1",
      resolver,
    );

    expect(result).toBeNull();
  });

  it("no encuentra coincidencia si la lista de turnos corresponde a otra fecha", () => {
    // Simula que getByDate ya filtró por la fecha correcta y no hay turnos
    // de esa persona ese día — la lista viene vacía.
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName([], "Pedro Ramírez", undefined, resolver);

    expect(result).toBeNull();
  });

  it("compara el nombre completo de un cliente registrado (clientId) resuelto por el resolver", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      clientId: "client-1",
    });
    const resolver = makeResolver({ "client-1": "Juan Pérez" });

    const result = findDuplicateScheduleByName(
      [other],
      "Juan Pérez",
      undefined,
      resolver,
    );

    expect(result).toBe(other);
  });

  it("detecta coincidencia sin distinguir mayúsculas, acentos ni espacios extra (normalizeText)", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      unregisteredClientName: "Juan Pérez",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName(
      [other],
      "juan perez ",
      undefined,
      resolver,
    );

    expect(result).toBe(other);
  });

  it("no encuentra coincidencia entre nombres distintos", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      unregisteredClientName: "María Torres",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName(
      [other],
      "Pedro Ramírez",
      undefined,
      resolver,
    );

    expect(result).toBeNull();
  });

  it("devuelve null si el nombre candidato está vacío", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      unregisteredClientName: "Pedro Ramírez",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName([other], "   ", undefined, resolver);

    expect(result).toBeNull();
  });

  it("ignora turnos cuyo nombre no se pudo resolver (ej. cliente ya no disponible localmente)", () => {
    const other = makeSchedule({
      id: "s-1",
      date: "2026-08-10",
      clientId: "client-desconocido",
    });
    const resolver = makeResolver({});

    const result = findDuplicateScheduleByName(
      [other],
      "Pedro Ramírez",
      undefined,
      resolver,
    );

    expect(result).toBeNull();
  });
});
