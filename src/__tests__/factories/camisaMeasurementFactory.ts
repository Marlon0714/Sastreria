import type { CamisaMeasurement } from "../../features/clients/domain/types";

const DEFAULT_CAMISA_MEASUREMENT: CamisaMeasurement = {
  id: "33333333-3333-4333-8333-333333333333",
  clientId: "11111111-1111-4111-8111-111111111111",
  espalda: 40,
  hombro: 14,
  talleDelantero: 45,
  talleTrasero: 46,
  distancia: 18,
  separacion: 9,
  pecho: 95,
  cintura: 80,
  base: 51,
  largo: 70,
  largoManga: 62,
  anchoManga: 20,
  escote: 38,
  cuello: null,
  brazo: null,
  puno: null,
  notes: "Primera toma",
  createdAt: "2026-01-02T10:00:00.000Z",
  updatedAt: "2026-01-02T10:00:00.000Z",
  syncStatus: "pending",
};

export function camisaMeasurementFactory(
  overrides: Partial<CamisaMeasurement> = {},
): CamisaMeasurement {
  return {
    ...DEFAULT_CAMISA_MEASUREMENT,
    ...overrides,
  };
}
