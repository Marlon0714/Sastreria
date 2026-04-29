import type { Measurement } from "../../features/clients/domain/types";

const DEFAULT_MEASUREMENT: Measurement = {
  id: "22222222-2222-4222-8222-222222222222",
  clientId: "11111111-1111-4111-8111-111111111111",
  measuredAt: "2026-01-02T10:00:00.000Z",
  pechoCm: 95,
  cinturaCm: 80,
  caderaCm: 98,
  largoCm: 110,
  notes: "Primera toma",
  createdAt: "2026-01-02T10:00:00.000Z",
  updatedAt: "2026-01-02T10:00:00.000Z",
  syncStatus: "pending",
};

export function measurementFactory(
  overrides: Partial<Measurement> = {},
): Measurement {
  return {
    ...DEFAULT_MEASUREMENT,
    ...overrides,
  };
}
