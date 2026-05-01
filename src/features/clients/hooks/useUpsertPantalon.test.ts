import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { PantalonMeasurement, UpsertPantalonDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useUpsertPantalon } from "./useUpsertPantalon";

const mockUpsertPantalon =
  jest.fn<(input: UpsertPantalonDTO) => Promise<PantalonMeasurement>>();

const mockMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: (input: UpsertPantalonDTO) => mockUpsertPantalon(input),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
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

describe("useUpsertPantalon", () => {
  beforeEach(() => {
    mockUpsertPantalon.mockReset();
  });

  it("usa repositorio del provider cuando no hay override", async () => {
    const created: PantalonMeasurement = {
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
    mockUpsertPantalon.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useUpsertPantalon(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: PantalonMeasurement | null = null;
    await act(async () => {
      output = await result.current.upsertPantalon({
        clientId: "11111111-1111-4111-8111-111111111111",
        largo: "104",
      });
    });

    expect(output).toEqual(created);
  });

  it("mapea errores de validacion zod", () => {
    const { result } = renderHook(() => useUpsertPantalon(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    const errors = result.current.validate({
      clientId: "invalid-id",
      largo: -3,
    });

    expect(errors.clientId?.message).toBe("El cliente es inválido");
    expect(errors.largo?.message).toBeDefined();
  });

  it("normaliza payload y delega en repositorio", async () => {
    const created: PantalonMeasurement = {
      id: "pantalon-2",
      clientId: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      cintura: null,
      base: null,
      tiro: null,
      pierna: null,
      rodilla: null,
      bota: 21.5,
      notes: "Ajustar",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };
    mockUpsertPantalon.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useUpsertPantalon(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    await act(async () => {
      await result.current.upsertPantalon({
        clientId: "11111111-1111-4111-8111-111111111111",
        largo: "104",
        bota: "21,5",
        notes: "  Ajustar  ",
      });
    });

    expect(mockUpsertPantalon).toHaveBeenCalledWith({
      clientId: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      bota: 21.5,
      notes: "Ajustar",
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("retorna null y error user-friendly cuando falla el repositorio", async () => {
    mockUpsertPantalon.mockRejectedValueOnce(new Error("db error"));

    const { result } = renderHook(() => useUpsertPantalon(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: PantalonMeasurement | null = null;
    await act(async () => {
      output = await result.current.upsertPantalon({
        clientId: "11111111-1111-4111-8111-111111111111",
      });
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar la medida de pantalón. Intenta nuevamente.",
    );
  });
});
