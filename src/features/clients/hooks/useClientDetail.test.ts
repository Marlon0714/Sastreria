import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { Client } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useClientDetail } from "./useClientDetail";

const mockFindById = jest.fn<(id: string) => Promise<Client | null>>();

const mockClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: (id: string) => mockFindById(id),
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const noopMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
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

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

describe("useClientDetail", () => {
  beforeEach(() => {
    mockFindById.mockReset();
  });

  it("loads client on mount via provider repository", async () => {
    const client = clientFactory({ id: CLIENT_ID });
    mockFindById.mockResolvedValueOnce(client);

    const { result } = renderHook(() => useClientDetail(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFindById).toHaveBeenCalledWith(CLIENT_ID);
    expect(result.current.client).toEqual(client);
    expect(result.current.error).toBeNull();
  });

  it("treats missing client as UI error", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useClientDetail(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.client).toBeNull();
    expect(result.current.error).toBe("El cliente no existe o fue eliminado.");
  });

  it("exposes error and recovers after reload", async () => {
    const client = clientFactory({ id: CLIENT_ID });
    mockFindById
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(client);

    const { result } = renderHook(() => useClientDetail(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "No se pudo cargar el detalle del cliente.",
    );

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.client).toEqual(client);
    expect(result.current.error).toBeNull();
  });
});
