import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { CamisaMeasurement, UpsertCamisaDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useUpsertCamisa } from "./useUpsertCamisa";

const mockUpsertCamisa =
  jest.fn<(input: UpsertCamisaDTO) => Promise<CamisaMeasurement>>();

const mockMeasurementRepository: MeasurementRepository = {
  upsertCamisa: (input: UpsertCamisaDTO) => mockUpsertCamisa(input),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
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

describe("useUpsertCamisa", () => {
  beforeEach(() => {
    mockUpsertCamisa.mockReset();
  });

  it("usa repositorio del provider cuando no hay override", async () => {
    const created: CamisaMeasurement = {
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
    };
    mockUpsertCamisa.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useUpsertCamisa(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: CamisaMeasurement | null = null;
    await act(async () => {
      output = await result.current.upsertCamisa({
        clientId: "11111111-1111-4111-8111-111111111111",
        espalda: "44",
      });
    });

    expect(output).toEqual(created);
  });

  it("mapea errores de validacion zod", () => {
    const { result } = renderHook(() => useUpsertCamisa(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    const errors = result.current.validate({
      clientId: "invalid-id",
      espalda: -3,
    });

    expect(errors.clientId?.message).toBe("El cliente es inválido");
    expect(errors.espalda?.message).toBeDefined();
  });

  it("normaliza payload y delega en repositorio", async () => {
    const created: CamisaMeasurement = {
      id: "camisa-2",
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44.5,
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
      notes: "Ajustar",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };
    mockUpsertCamisa.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useUpsertCamisa(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    await act(async () => {
      await result.current.upsertCamisa({
        clientId: "11111111-1111-4111-8111-111111111111",
        espalda: "44,5",
        notes: "  Ajustar  ",
      });
    });

    expect(mockUpsertCamisa).toHaveBeenCalledWith({
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44.5,
      notes: "Ajustar",
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("retorna null y error user-friendly cuando falla el repositorio", async () => {
    mockUpsertCamisa.mockRejectedValueOnce(new Error("db error"));

    const { result } = renderHook(() => useUpsertCamisa(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: CamisaMeasurement | null = null;
    await act(async () => {
      output = await result.current.upsertCamisa({
        clientId: "11111111-1111-4111-8111-111111111111",
      });
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar la medida de camisa. Intenta nuevamente.",
    );
  });
});
