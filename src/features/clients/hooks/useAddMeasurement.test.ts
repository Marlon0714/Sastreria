import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import { measurementFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { AddMeasurementDTO, Measurement } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useAddMeasurement } from "./useAddMeasurement";

const mockAddMeasurement =
  jest.fn<(input: AddMeasurementDTO) => Promise<Measurement>>();

const mockMeasurementRepository: MeasurementRepository = {
  addMeasurement: (input: AddMeasurementDTO) => mockAddMeasurement(input),
  findMeasurementsByClientId: jest.fn(
    async (_clientId: string): Promise<Measurement[]> => Promise.resolve([]),
  ),
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

describe("useAddMeasurement", () => {
  beforeEach(() => {
    mockAddMeasurement.mockReset();
  });

  it("uses provider default repository when no dependency override is provided", async () => {
    const createdMeasurement = measurementFactory();
    mockAddMeasurement.mockResolvedValueOnce(createdMeasurement);

    const { result } = renderHook(() => useAddMeasurement(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.addMeasurement>> =
      null;

    await act(async () => {
      output = await result.current.addMeasurement({
        clientId: "11111111-1111-4111-8111-111111111111",
        measuredAt: "2026-04-28T10:00:00.000Z",
        pechoCm: "92",
        cinturaCm: "70",
        caderaCm: "95",
        largoCm: "110",
        notes: "",
      });
    });

    expect(output).toEqual(createdMeasurement);
  });

  it("maps zod validation errors", () => {
    const { result } = renderHook(() => useAddMeasurement(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    const errors = result.current.validate({
      clientId: "invalid-id",
      measuredAt: "2026-04-28T10:00:00",
      pechoCm: "",
      cinturaCm: "",
      caderaCm: "",
      largoCm: "",
      notes: "",
    });

    expect(errors.clientId?.message).toBe("El cliente es inválido");
    expect(errors.measuredAt?.message).toBe(
      "La fecha debe estar en formato ISO 8601 con zona horaria",
    );
    expect(errors.pechoCm?.message).toBeDefined();
  });

  it("adds measurement successfully after parsing values", async () => {
    const createdMeasurement = measurementFactory();
    mockAddMeasurement.mockResolvedValueOnce(createdMeasurement);

    const { result } = renderHook(() => useAddMeasurement(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.addMeasurement>> =
      null;

    await act(async () => {
      output = await result.current.addMeasurement({
        clientId: "11111111-1111-4111-8111-111111111111",
        measuredAt: "2026-04-28T10:00:00.000Z",
        pechoCm: "92,5",
        cinturaCm: "70.5",
        caderaCm: "95",
        largoCm: "110",
        notes: "  Ajustar molde  ",
      });
    });

    expect(mockAddMeasurement).toHaveBeenCalledWith({
      clientId: "11111111-1111-4111-8111-111111111111",
      measuredAt: "2026-04-28T10:00:00.000Z",
      pechoCm: 92.5,
      cinturaCm: 70.5,
      caderaCm: 95,
      largoCm: 110,
      notes: "Ajustar molde",
    });
    expect(output).toEqual(createdMeasurement);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("returns null and exposes user-friendly error on repository failure", async () => {
    mockAddMeasurement.mockRejectedValueOnce(new Error("db error"));
    const { result } = renderHook(() => useAddMeasurement(), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: mockMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.addMeasurement>> =
      null;

    await act(async () => {
      output = await result.current.addMeasurement({
        clientId: "11111111-1111-4111-8111-111111111111",
        measuredAt: "2026-04-28T10:00:00.000Z",
        pechoCm: "92",
        cinturaCm: "70",
        caderaCm: "95",
        largoCm: "110",
        notes: "",
      });
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar la medida. Intenta nuevamente.",
    );
    expect(result.current.isSubmitting).toBe(false);
  });
});
