import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { Client, UpdateClientDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useDeleteClient } from "./useDeleteClient";

const mockDelete = jest.fn<(id: string) => Promise<void>>();

const mockClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
  update: jest.fn(
    async (_input: UpdateClientDTO): Promise<Client> =>
      Promise.reject(new Error("unused")),
  ),
  delete: (id: string) => mockDelete(id),
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

describe("useDeleteClient", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("elimina cliente correctamente", async () => {
    // Arrange
    const clientId = "11111111-1111-4111-8111-111111111111";
    mockDelete.mockResolvedValueOnce();

    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    // Act
    let output = false;
    await act(async () => {
      output = await result.current.deleteClient(clientId);
    });

    // Assert
    expect(mockDelete).toHaveBeenCalledWith(clientId);
    expect(output).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it("expone error cuando falla el repositorio", async () => {
    // Arrange
    const clientId = "11111111-1111-4111-8111-111111111111";
    mockDelete.mockRejectedValueOnce(new Error("db error"));

    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    // Act
    let output = true;
    await act(async () => {
      output = await result.current.deleteClient(clientId);
    });

    // Assert
    expect(output).toBe(false);
    expect(result.current.error).toBe(
      "No se pudo eliminar el cliente. Intenta nuevamente.",
    );
    expect(result.current.isDeleting).toBe(false);
  });

  it("cambia isDeleting durante la operación", async () => {
    // Arrange
    const clientId = "11111111-1111-4111-8111-111111111111";

    let resolveDelete: (() => void) | null = null;
    mockDelete.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    // Act
    let deletePromise: Promise<boolean> | null = null;
    act(() => {
      deletePromise = result.current.deleteClient(clientId);
    });

    // Assert
    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      if (resolveDelete) {
        resolveDelete();
      }
      if (deletePromise) {
        await deletePromise;
      }
    });

    expect(result.current.isDeleting).toBe(false);
  });
});
