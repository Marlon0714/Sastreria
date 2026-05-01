import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { PantalonMeasurement } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { usePantalonMeasurement } from "./usePantalonMeasurement";

const mockFindPantalonByClientId =
  jest.fn<(clientId: string) => Promise<PantalonMeasurement | null>>();

const mockMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: (clientId: string) =>
    mockFindPantalonByClientId(clientId),
};

const noopClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
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

describe("usePantalonMeasurement", () => {
  beforeEach(() => {
    mockFindPantalonByClientId.mockReset();
  });

  it("usa repositorio del provider para carga inicial", async () => {
    const measurement: PantalonMeasurement = {
      id: "pantalon-1",
      clientId: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      cintura: null,
      base: null,
      tiro: null,
      pierna: null,
      rodilla: null,
      bota: null,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };
    mockFindPantalonByClientId.mockResolvedValueOnce(measurement);

    const { result } = renderHook(
      () => usePantalonMeasurement("11111111-1111-4111-8111-111111111111"),
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
    const measurement: PantalonMeasurement = {
      id: "pantalon-2",
      clientId: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      cintura: null,
      base: null,
      tiro: null,
      pierna: null,
      rodilla: null,
      bota: 21,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };

    mockFindPantalonByClientId
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(measurement);

    const { result } = renderHook(
      () => usePantalonMeasurement("11111111-1111-4111-8111-111111111111"),
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

    expect(result.current.error).toBe(
      "No se pudo cargar la medida de pantalón.",
    );

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(result.current.measurement).toEqual(measurement);
    expect(mockFindPantalonByClientId).toHaveBeenCalledTimes(2);
  });
});
