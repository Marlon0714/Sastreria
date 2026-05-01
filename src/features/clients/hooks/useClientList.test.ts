import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { Client, CreateClientDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useClientList } from "./useClientList";

const mockFindAll = jest.fn<() => Promise<Client[]>>();

const mockClientRepository: ClientRepository = {
  create: jest.fn(
    async (_input: CreateClientDTO): Promise<Client> =>
      Promise.reject(new Error("unused")),
  ),
  findAll: () => mockFindAll(),
  findById: jest.fn(
    async (_id: string): Promise<Client | null> => Promise.resolve(null),
  ),
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

describe("useClientList", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it("uses provider default repository when no dependency override is provided", async () => {
    const clients = [clientFactory()];
    mockFindAll.mockResolvedValueOnce(clients);

    const { result } = renderHook(() => useClientList(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(result.current.clients).toEqual(clients);
  });

  it("loads clients on mount", async () => {
    const clients = [
      clientFactory(),
      clientFactory({
        id: "33333333-3333-4333-8333-333333333333",
        firstName: "Laura",
      }),
    ];
    mockFindAll.mockResolvedValueOnce(clients);

    const { result } = renderHook(() => useClientList(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(result.current.clients).toEqual(clients);
    expect(result.current.error).toBeNull();
  });

  it("exposes error and recovers after reload", async () => {
    const clients = [
      clientFactory({ id: "44444444-4444-4444-8444-444444444444" }),
    ];

    mockFindAll
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(clients);

    const { result } = renderHook(() => useClientList(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "No se pudo cargar la lista de clientes.",
    );

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockFindAll).toHaveBeenCalledTimes(2);
    expect(result.current.clients).toEqual(clients);
  });
});
