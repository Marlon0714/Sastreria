import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { measurementFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { Measurement } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useClientMeasurementHistory } from "./useClientMeasurementHistory";

const mockFindMeasurementsByClientId =
  jest.fn<(clientId: string) => Promise<Measurement[]>>();

const mockMeasurementRepository: MeasurementRepository = {
  addMeasurement: jest.fn(async () => Promise.reject(new Error("unused"))),
  findMeasurementsByClientId: (clientId: string) =>
    mockFindMeasurementsByClientId(clientId),
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

describe("useClientMeasurementHistory", () => {
  beforeEach(() => {
    mockFindMeasurementsByClientId.mockReset();
  });

  it("uses provider default repository when no dependency override is provided", async () => {
    const measurements = [measurementFactory()];
    mockFindMeasurementsByClientId.mockResolvedValueOnce(measurements);

    const { result } = renderHook(
      () => useClientMeasurementHistory("11111111-1111-4111-8111-111111111111"),
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

    expect(result.current.measurements).toEqual(measurements);
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
        wrapper: createWrapper({
          clientRepository: noopClientRepository,
          measurementRepository: mockMeasurementRepository,
        }),
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

    const { result } = renderHook(
      () => useClientMeasurementHistory("11111111-1111-4111-8111-111111111111"),
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
