import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
} from "../domain/repository";
import type { SacoMeasurement, UpsertSacoDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useUpsertSaco } from "./useUpsertSaco";

const mockUpsertSaco =
  jest.fn<(input: UpsertSacoDTO) => Promise<SacoMeasurement>>();

const mockMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
  upsertSaco: (input: UpsertSacoDTO) => mockUpsertSaco(input),
  upsertChaleco: jest.fn(async () => Promise.reject(new Error("unused"))),
  findSacoByClientId: jest.fn(async () => Promise.resolve(null)),
  findChalecoByClientId: jest.fn(async () => Promise.resolve(null)),
  deleteCamisa: jest.fn(async () => Promise.resolve()),
  deletePantalon: jest.fn(async () => Promise.resolve()),
  deleteSaco: jest.fn(async () => Promise.resolve()),
  deleteChaleco: jest.fn(async () => Promise.resolve()),
};

const noopClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const noopTallaRepository: TallaRepository = {
  upsert: jest.fn(async () => Promise.reject(new Error("unused"))),
  findByClientId: jest.fn(async () => Promise.resolve([])),
  delete: jest.fn(async () => Promise.resolve()),
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

describe("useUpsertSaco", () => {
  beforeEach(() => {
    mockUpsertSaco.mockReset();
  });

  it("mapea errores de validacion zod", () => {
    const { result } = renderHook(() => useUpsertSaco(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    const errors = result.current.validate({
      clientId: "invalid-id",
      espalda: -3,
    });

    expect(errors.clientId?.message).toBe("El cliente es inválido");
    expect(errors.espalda?.message).toBeDefined();
  });

  it("no reporta errores cuando los valores son válidos", () => {
    const { result } = renderHook(() => useUpsertSaco(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    const errors = result.current.validate({
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: "44",
    });

    expect(errors).toEqual({});
  });

  it("normaliza payload y delega en repositorio", async () => {
    const created: SacoMeasurement = {
      id: "saco-1",
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44.5,
      hombro: null,
      talleDelantero: null,
      talleTrasero: null,
      distancia: null,
      separacion: null,
      pechoAjustado: null,
      pechoAncho: null,
      cinturaAjustado: null,
      cinturaAncho: null,
      baseAjustado: null,
      baseAncho: null,
      largo: null,
      mangaLarga: null,
      mangaCorta: null,
      escote: null,
      cuelloNormal: null,
      cuelloCruce: null,
      brazo: null,
      puno: null,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };
    mockUpsertSaco.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useUpsertSaco(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    await act(async () => {
      await result.current.upsertSaco({
        clientId: "11111111-1111-4111-8111-111111111111",
        espalda: "44,5",
      });
    });

    expect(mockUpsertSaco).toHaveBeenCalledWith({
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44.5,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("retorna null y error user-friendly cuando falla el repositorio", async () => {
    mockUpsertSaco.mockRejectedValueOnce(new Error("db error"));

    const { result } = renderHook(() => useUpsertSaco(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    let output: SacoMeasurement | null = null;
    await act(async () => {
      output = await result.current.upsertSaco({
        clientId: "11111111-1111-4111-8111-111111111111",
      });
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar la medida de saco. Intenta nuevamente.",
    );
  });
});
