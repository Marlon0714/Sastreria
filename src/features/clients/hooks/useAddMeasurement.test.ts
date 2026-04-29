import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { measurementFactory } from "../../../__tests__/factories";
import type { AddMeasurementDTO } from "../domain/types";
import { useAddMeasurement } from "./useAddMeasurement";

const mockAddMeasurement =
  jest.fn<(input: AddMeasurementDTO) => Promise<unknown>>();

jest.mock("../../../data/local/MeasurementRepositoryImpl", () => {
  return {
    MeasurementRepositoryImpl: jest.fn().mockImplementation(() => ({
      addMeasurement: (input: AddMeasurementDTO) => mockAddMeasurement(input),
    })),
  };
});

describe("useAddMeasurement", () => {
  beforeEach(() => {
    mockAddMeasurement.mockReset();
  });

  it("maps zod validation errors", () => {
    const { result } = renderHook(() => useAddMeasurement());

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

    const { result } = renderHook(() => useAddMeasurement());

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
    const { result } = renderHook(() => useAddMeasurement());

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
