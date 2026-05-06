import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { CamisaMeasurement } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useCamisaMeasurement } from "./useCamisaMeasurement";

const mockFindCamisaByClientId =
  jest.fn<(clientId: string) => Promise<CamisaMeasurement | null>>();

const mockMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: (clientId: string) =>
    mockFindCamisaByClientId(clientId),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
};

const noopClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

function createWrapper(dependencies: ClientsDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      ClientsDependenciesProvider,
      { dependencies },
      children,
    );
  };
}

describe("useCamisaMeasurement", () => {
  beforeEach(() => {
    mockFindCamisaByClientId.mockReset();
  });

  it("usa repositorio del provider para carga inicial", async () => {
    const measurement: CamisaMeasurement = {
      id: "camisa-1",
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44,
      hombro: null,
      talleDelantero: null,
      talleTrasero: null,
      distancia: null,
      separacion: null,
      pecho: null,
      cintura: null,
      base: null,
      largo: null,
      largoManga: null,
      anchoManga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
      changedBy: "user-1",
      changedAt: "2026-01-01T00:00:00.000Z",
    };
    mockFindCamisaByClientId.mockResolvedValueOnce(measurement);

    const { result } = renderHook(
      () => useCamisaMeasurement("11111111-1111-4111-8111-111111111111"),
      {
        wrapper: createWrapper({
          clientRepository: noopClientRepository,
          measurementRepository: mockMeasurementRepository,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.measurement).toEqual(measurement);
  });

  it("expone error y recupera tras reload", async () => {
    const measurement: CamisaMeasurement = {
      id: "camisa-2",
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 45,
      hombro: null,
      talleDelantero: null,
      talleTrasero: null,
      distancia: null,
      separacion: null,
      pecho: null,
      cintura: null,
      base: null,
      largo: null,
      largoManga: null,
      anchoManga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
      changedBy: "user-1",
      changedAt: "2026-01-01T00:00:00.000Z",
    };

    mockFindCamisaByClientId
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(measurement);

    const { result } = renderHook(
      () => useCamisaMeasurement("11111111-1111-4111-8111-111111111111"),
      {
        wrapper: createWrapper({
          clientRepository: noopClientRepository,
          measurementRepository: mockMeasurementRepository,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("No se pudo cargar la medida de camisa.");

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(result.current.measurement).toEqual(measurement);
    expect(mockFindCamisaByClientId).toHaveBeenCalledTimes(2);
  });
});
