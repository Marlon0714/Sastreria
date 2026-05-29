import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
} from "../domain/repository";
import type { Client, UpdateClientDTO } from "../domain/types";
import type { UpdateClientSchemaInput } from "../domain/schemas";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useUpdateClient } from "./useUpdateClient";

const mockUpdate = jest.fn<(input: UpdateClientDTO) => Promise<Client>>();

const mockClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
  update: (input: UpdateClientDTO) => mockUpdate(input),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const noopMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
  upsertSaco: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertChaleco: jest.fn(async () => Promise.reject(new Error("unused"))),
  findSacoByClientId: jest.fn(async () => Promise.resolve(null)),
  findChalecoByClientId: jest.fn(async () => Promise.resolve(null)),
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

describe("useUpdateClient", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
  });

  it("actualiza cliente correctamente", async () => {
    // Arrange
    const updatedClient = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "VIP",
    });
    mockUpdate.mockResolvedValueOnce(updatedClient);

    const values: UpdateClientSchemaInput = {
      id: updatedClient.id,
      firstName: " Ana ",
      lastName: " Torres ",
      phone: " 3001234567 ",
      notes: " VIP ",
    };

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    let output: Client | null = null;
    await act(async () => {
      output = await result.current.updateClient(values);
    });

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({
      id: updatedClient.id,
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "VIP",
    });
    expect(output).toEqual(updatedClient);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("expone error cuando falla el repositorio", async () => {
    // Arrange
    mockUpdate.mockRejectedValueOnce(new Error("db error"));

    const values: UpdateClientSchemaInput = {
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "",
    };

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    let output: Client | null = null;
    await act(async () => {
      output = await result.current.updateClient(values);
    });

    // Assert
    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo actualizar el cliente. Intenta nuevamente.",
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it("cambia isSubmitting durante el submit", async () => {
    // Arrange
    const updatedClient = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });

    let resolveUpdate: ((value: Client) => void) | null = null;
    mockUpdate.mockImplementationOnce(
      () =>
        new Promise<Client>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const values: UpdateClientSchemaInput = {
      id: updatedClient.id,
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "",
    };

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    let submitPromise: Promise<Client | null> | null = null;
    act(() => {
      submitPromise = result.current.updateClient(values);
    });

    // Assert
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      if (resolveUpdate) {
        resolveUpdate(updatedClient);
      }
      if (submitPromise) {
        await submitPromise;
      }
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("valida campos y retorna errores inline", () => {
    // Arrange
    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    const errors = result.current.validate({
      id: "invalid-id",
      firstName: "",
      lastName: "",
      phone: "123",
      notes: "",
    });

    // Assert
    expect(errors.id?.message).toBe("El id de cliente es inválido");
    expect(errors.firstName?.message).toBe("El nombre es obligatorio");
    expect(errors.lastName?.message).toBe("El apellido es obligatorio");
    expect(errors.phone?.message).toBe("El teléfono no es válido");
  });
});
