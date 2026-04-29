import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { measurementFactory } from "../../../__tests__/factories";
import type { Measurement } from "../domain/types";
import { useClientMeasurementHistory } from "./useClientMeasurementHistory";

const mockFindMeasurementsByClientId =
  jest.fn<(clientId: string) => Promise<Measurement[]>>();

jest.mock("../../../data/local/MeasurementRepositoryImpl", () => {
  return {
    MeasurementRepositoryImpl: jest.fn().mockImplementation(() => ({
      findMeasurementsByClientId: (clientId: string) =>
        mockFindMeasurementsByClientId(clientId),
    })),
  };
});

describe("useClientMeasurementHistory", () => {
  beforeEach(() => {
    mockFindMeasurementsByClientId.mockReset();
  });

  it("loads measurement history for the provided client id", async () => {
    const measurements = [
      measurementFactory(),
      measurementFactory({
        id: "55555555-5555-4555-8555-555555555555",
        measuredAt: "2026-04-27T10:00:00.000Z",
      }),
    ];
    mockFindMeasurementsByClientId.mockResolvedValueOnce(measurements);

    const { result } = renderHook(
      ({ clientId }: { clientId: string }) =>
        useClientMeasurementHistory(clientId),
      {
        initialProps: { clientId: "11111111-1111-4111-8111-111111111111" },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFindMeasurementsByClientId).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result.current.measurements).toEqual(measurements);
    expect(result.current.error).toBeNull();
  });

  it("exposes error and recovers after reload", async () => {
    const measurements = [
      measurementFactory({ id: "66666666-6666-4666-8666-666666666666" }),
    ];

    mockFindMeasurementsByClientId
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(measurements);

    const { result } = renderHook(() =>
      useClientMeasurementHistory("11111111-1111-4111-8111-111111111111"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "No se pudo cargar el historial de medidas.",
    );

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockFindMeasurementsByClientId).toHaveBeenCalledTimes(2);
    expect(result.current.measurements).toEqual(measurements);
  });
});
