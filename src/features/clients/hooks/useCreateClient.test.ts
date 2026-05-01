import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import type { UseFormReset } from "react-hook-form";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
} from "../domain/repository";
import type { Client, CreateClientDTO } from "../domain/types";
import type { CreateClientSchemaInput } from "../domain/schemas";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useCreateClient } from "./useCreateClient";

const mockCreate = jest.fn<(input: CreateClientDTO) => Promise<Client>>();

const mockClientRepository: ClientRepository = {
  create: (input: CreateClientDTO) => mockCreate(input),
  findAll: jest.fn(async (): Promise<Client[]> => Promise.resolve([])),
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

describe("useCreateClient", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("uses provider default repository when no dependency override is provided", async () => {
    const createdClient = clientFactory();
    mockCreate.mockResolvedValueOnce(createdClient);

    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.createClient>> = null;

    await act(async () => {
      output = await result.current.createClient(
        {
          firstName: "Ana",
          lastName: "Torres",
          phone: "3001234567",
          notes: "",
        },
        resetMock,
      );
    });

    expect(output).toEqual(createdClient);
  });

  it("maps zod validation errors", () => {
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    const errors = result.current.validate({
      firstName: "",
      lastName: "",
      phone: "123",
      notes: "",
    });

    expect(errors.firstName?.message).toBe("El nombre es obligatorio");
    expect(errors.lastName?.message).toBe("El apellido es obligatorio");
    expect(errors.phone?.message).toBe("El teléfono no es válido");
  });

  it("creates client successfully and resets form", async () => {
    const createdClient = clientFactory();
    mockCreate.mockResolvedValueOnce(createdClient);

    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.createClient>> = null;

    await act(async () => {
      output = await result.current.createClient(
        {
          firstName: "  Ana ",
          lastName: " Torres  ",
          phone: " 3001234567 ",
          notes: "  Cliente frecuente  ",
        },
        resetMock,
      );
    });

    expect(mockCreate).toHaveBeenCalledWith({
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "Cliente frecuente",
    });
    expect(resetMock).toHaveBeenCalledWith({
      firstName: "",
      lastName: "",
      phone: "",
      notes: "",
    });
    expect(output).toEqual(createdClient);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("returns null and exposes user-friendly error on repository failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db error"));
    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
      }),
    });

    let output: Awaited<ReturnType<typeof result.current.createClient>> = null;

    await act(async () => {
      output = await result.current.createClient(
        {
          firstName: "Ana",
          lastName: "Torres",
          phone: "3001234567",
          notes: "",
        },
        resetMock,
      );
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo crear el cliente. Intenta nuevamente.",
    );
    expect(result.current.isSubmitting).toBe(false);
    expect(resetMock).not.toHaveBeenCalled();
  });
});
