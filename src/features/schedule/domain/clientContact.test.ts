import { describe, expect, it } from "@jest/globals";

import type { Client } from "../../clients/domain/types";
import { resolveClientContact } from "./clientContact";

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

describe("resolveClientContact", () => {
  it("devuelve el nombre completo y el teléfono de un cliente registrado existente", () => {
    const clientsById = new Map([
      [
        "client-1",
        makeClient({ id: "client-1", firstName: "Ana", lastName: "Torres", phone: "3001234567" }),
      ],
    ]);

    const contact = resolveClientContact(
      { clientId: "client-1", unregisteredClientName: undefined },
      clientsById,
    );

    expect(contact).toEqual({ name: "Ana Torres", phone: "3001234567" });
  });

  it("devuelve phone undefined cuando el cliente no tiene teléfono registrado", () => {
    const clientsById = new Map([
      ["client-1", makeClient({ id: "client-1", phone: "" })],
    ]);

    const contact = resolveClientContact(
      { clientId: "client-1", unregisteredClientName: undefined },
      clientsById,
    );

    expect(contact).toEqual({ name: "Ana Torres" });
    expect(contact.phone).toBeUndefined();
  });

  it("devuelve 'Cliente eliminado' (sin teléfono) si el clientId ya no existe en clientsById", () => {
    const clientsById = new Map<string, Client>();

    const contact = resolveClientContact(
      { clientId: "client-borrado", unregisteredClientName: undefined },
      clientsById,
    );

    expect(contact).toEqual({ name: "Cliente eliminado" });
  });

  it("devuelve unregisteredClientName (sin teléfono) cuando el turno no tiene clientId", () => {
    const clientsById = new Map<string, Client>();

    const contact = resolveClientContact(
      { clientId: undefined, unregisteredClientName: "Pedro" },
      clientsById,
    );

    expect(contact).toEqual({ name: "Pedro" });
  });

  it("devuelve 'Cliente' como fallback sin clientId ni unregisteredClientName", () => {
    const clientsById = new Map<string, Client>();

    const contact = resolveClientContact(
      { clientId: undefined, unregisteredClientName: undefined },
      clientsById,
    );

    expect(contact).toEqual({ name: "Cliente" });
  });
});
