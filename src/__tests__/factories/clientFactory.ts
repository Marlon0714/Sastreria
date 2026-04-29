import type { Client } from "../../features/clients/domain/types";

const DEFAULT_CLIENT: Client = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
  notes: "Cliente frecuente",
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

export function clientFactory(overrides: Partial<Client> = {}): Client {
  return {
    ...DEFAULT_CLIENT,
    ...overrides,
    measurements: overrides.measurements ?? DEFAULT_CLIENT.measurements,
  };
}
