import { describe, expect, it } from "@jest/globals";

import { clientFactory } from "../../../__tests__/factories";
import type { Schedule } from "../../schedule/domain/types";
import { buildMyActivityItems, sumActivityPrices } from "./myActivity";

const OWN_PROFILE_ID = "op-1";

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  operarioId: OWN_PROFILE_ID,
  price: 40000,
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "listo_para_entregar",
  statusLocked: false,
  readyAt: "2026-08-15T14:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-15T14:00:00.000Z",
  syncStatus: "pending",
};

const client = clientFactory({
  id: "client-1",
  firstName: "Ana",
  lastName: "Torres",
});
const clientsById = new Map([[client.id, client]]);

describe("buildMyActivityItems", () => {
  it("incluye un turno listo/entregado dentro del rango por el propio operario, con el nombre del cliente", () => {
    const items = buildMyActivityItems(
      [baseSchedule],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(items).toHaveLength(1);
    expect(items[0]!.clientLabel).toBe("Ana Torres");
  });

  it("excluye turnos de OTRO operario", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, operarioId: "op-2" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(items).toHaveLength(0);
  });

  it("excluye turnos que aún no están listos/entregados", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, status: "en_proceso", readyAt: undefined }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(items).toHaveLength(0);
  });

  it("agrupa por el día en que se marcó listo, no por la fecha agendada del turno", () => {
    const schedule = {
      ...baseSchedule,
      date: "2026-08-20",
      readyAt: "2026-08-15T14:00:00.000Z",
    };

    expect(
      buildMyActivityItems(
        [schedule],
        clientsById,
        OWN_PROFILE_ID,
        "2026-08-15",
        "2026-08-15",
      ),
    ).toHaveLength(1);

    expect(
      buildMyActivityItems(
        [schedule],
        clientsById,
        OWN_PROFILE_ID,
        "2026-08-20",
        "2026-08-20",
      ),
    ).toHaveLength(0);
  });

  it("usa deliveredAt si el turno nunca pasó por listo_para_entregar", () => {
    const items = buildMyActivityItems(
      [
        {
          ...baseSchedule,
          status: "entregado",
          readyAt: undefined,
          deliveredAt: "2026-08-16T09:00:00.000Z",
        },
      ],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-16",
      "2026-08-16",
    );

    expect(items).toHaveLength(1);
  });

  it("muestra 'Cliente eliminado' si el clientId ya no existe", () => {
    const items = buildMyActivityItems(
      [baseSchedule],
      new Map(),
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(items[0]!.clientLabel).toBe("Cliente eliminado");
  });

  it("muestra el nombre sin registrar cuando el turno no tiene clientId", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, clientId: undefined, unregisteredClientName: "Pedro" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(items[0]!.clientLabel).toBe("Pedro");
  });

  it("incluye un turno completado a mitad de un rango de una semana", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, readyAt: "2026-08-12T14:00:00.000Z" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-10",
      "2026-08-16",
    );

    expect(items).toHaveLength(1);
  });

  it("incluye un turno completado a mitad de un rango de un mes", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, readyAt: "2026-08-17T14:00:00.000Z" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-01",
      "2026-08-31",
    );

    expect(items).toHaveLength(1);
  });

  it("incluye un turno completado justo en el límite inicial del rango (inclusive)", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, readyAt: "2026-08-10T00:30:00.000Z" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-10",
      "2026-08-16",
    );

    expect(items).toHaveLength(1);
  });

  it("incluye un turno completado justo en el límite final del rango (inclusive)", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, readyAt: "2026-08-16T23:30:00.000Z" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-10",
      "2026-08-16",
    );

    expect(items).toHaveLength(1);
  });

  it("excluye un turno completado fuera del rango, en el mes siguiente", () => {
    const items = buildMyActivityItems(
      [{ ...baseSchedule, readyAt: "2026-09-01T10:00:00.000Z" }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-01",
      "2026-08-31",
    );

    expect(items).toHaveLength(0);
  });
});

describe("sumActivityPrices", () => {
  it("suma el precio de todos los items", () => {
    const items = buildMyActivityItems(
      [baseSchedule, { ...baseSchedule, id: "schedule-2", price: 15000 }],
      clientsById,
      OWN_PROFILE_ID,
      "2026-08-15",
      "2026-08-15",
    );

    expect(sumActivityPrices(items)).toBe(55000);
  });

  it("retorna 0 para una lista vacía", () => {
    expect(sumActivityPrices([])).toBe(0);
  });
});
