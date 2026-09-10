import { describe, expect, it } from "@jest/globals";

import type { Client } from "../../clients/domain/types";
import { resolveClientLabel } from "./clientLabel";

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

describe("resolveClientLabel", () => {
  it("devuelve el nombre completo de un cliente registrado existente", () => {
    const clientsById = new Map([
      ["client-1", makeClient({ id: "client-1", firstName: "Ana", lastName: "Torres" })],
    ]);

    const label = resolveClientLabel(
      { clientId: "client-1", unregisteredClientName: undefined },
      clientsById,
    );

    expect(label).toBe("Ana Torres");
  });

  it("devuelve 'Cliente eliminado' si el clientId ya no existe en clientsById", () => {
    const clientsById = new Map<string, Client>();

    const label = resolveClientLabel(
      { clientId: "client-borrado", unregisteredClientName: undefined },
      clientsById,
    );

    expect(label).toBe("Cliente eliminado");
  });

  it("devuelve unregisteredClientName cuando el turno no tiene clientId", () => {
    const clientsById = new Map<string, Client>();

    const label = resolveClientLabel(
      { clientId: undefined, unregisteredClientName: "Pedro" },
      clientsById,
    );

    expect(label).toBe("Pedro");
  });

  it("devuelve 'Cliente' como fallback sin clientId ni unregisteredClientName", () => {
    const clientsById = new Map<string, Client>();

    const label = resolveClientLabel(
      { clientId: undefined, unregisteredClientName: undefined },
      clientsById,
    );

    expect(label).toBe("Cliente");
  });
});
