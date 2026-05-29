import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import type { UseFormReset } from "react-hook-form";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
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
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
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
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
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
        tallaRepository: noopTallaRepository,
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
        tallaRepository: noopTallaRepository,
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
        tallaRepository: noopTallaRepository,
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
      phone2: "",
      phone3: "",
      cedula: "",
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
        tallaRepository: noopTallaRepository,
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

  it("createClient con phone2 y phone3 válidos incluye phones en el DTO al repositorio", async () => {
    // Arrange
    const createdClient = clientFactory();
    mockCreate.mockResolvedValueOnce(createdClient);
    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    await act(async () => {
      await result.current.createClient(
        {
          firstName: "Ana",
          lastName: "Torres",
          phone: "3001234567",
          phone2: "3009998888",
          phone3: "3118887777",
          notes: "",
        },
        resetMock,
      );
    });

    // Assert
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        phones: ["3009998888", "3118887777"],
      }),
    );
  });

  it("createClient con phone2 vacío no incluye phones en el DTO al repositorio", async () => {
    // Arrange
    const createdClient = clientFactory();
    mockCreate.mockResolvedValueOnce(createdClient);
    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    await act(async () => {
      await result.current.createClient(
        {
          firstName: "Ana",
          lastName: "Torres",
          phone: "3001234567",
          phone2: "",
          phone3: "",
          notes: "",
        },
        resetMock,
      );
    });

    // Assert
    const callPayload = mockCreate.mock.calls[0]?.[0];
    expect(callPayload?.phones).toBeUndefined();
  });

  it("createClient con cedula válida la incluye en el DTO al repositorio", async () => {
    // Arrange
    const createdClient = clientFactory();
    mockCreate.mockResolvedValueOnce(createdClient);
    const resetMock: UseFormReset<CreateClientSchemaInput> = jest.fn();
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper({
        clientRepository: mockClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: noopTallaRepository,
      }),
    });

    // Act
    await act(async () => {
      await result.current.createClient(
        {
          firstName: "Ana",
          lastName: "Torres",
          phone: "3001234567",
          cedula: "12345678",
          notes: "",
        },
        resetMock,
      );
    });

    // Assert
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cedula: "12345678",
      }),
    );
  });
});
