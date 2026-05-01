import type { PantalonMeasurement } from "../../features/clients/domain/types";

const DEFAULT_PANTALON_MEASUREMENT: PantalonMeasurement = {
  id: "44444444-4444-4444-8444-444444444444",
  clientId: "11111111-1111-4111-8111-111111111111",
  largo: 105,
  cintura: 82,
  base: 52,
  tiro: 30,
  pierna: 60,
  rodilla: 42,
  bota: 38,
  notes: "Ajustar bota",
  createdAt: "2026-01-03T10:00:00.000Z",
  updatedAt: "2026-01-03T10:00:00.000Z",
  syncStatus: "pending",
};

export function pantalonMeasurementFactory(
  overrides: Partial<PantalonMeasurement> = {},
): PantalonMeasurement {
  return {
    ...DEFAULT_PANTALON_MEASUREMENT,
    ...overrides,
  };
}
