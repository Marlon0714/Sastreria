import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
} from "../domain/repository";
import type {
  ClientTalla,
  CreateTallaDTO,
  UpdateTallaDTO,
} from "../domain/types";
import { ClientsDependenciesProvider } from "./ClientsDependenciesProvider";
import { useTallas } from "./useTallas";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

function makeTalla(overrides: Partial<ClientTalla> = {}): ClientTalla {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    clientId: CLIENT_ID,
    type: "camisa",
    value: "M",
    notes: null,
    createdAt: "2026-05-14T10:00:00.000Z",
    updatedAt: "2026-05-14T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

const mockFindByClientId =
  jest.fn<(clientId: string) => Promise<ClientTalla[]>>();
const mockUpsert =
  jest.fn<(input: CreateTallaDTO | UpdateTallaDTO) => Promise<ClientTalla>>();
const mockDelete = jest.fn<(id: string) => Promise<void>>();

const mockTallaRepository: TallaRepository = {
  findByClientId: (clientId: string) => mockFindByClientId(clientId),
  upsert: (input: CreateTallaDTO | UpdateTallaDTO) => mockUpsert(input),
  delete: (id: string) => mockDelete(id),
};

const noopClientRepository: ClientRepository = {
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  findAll: jest.fn(async () => Promise.resolve([])),
  findById: jest.fn(async () => Promise.resolve(null)),
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

function createWrapper(dependencies: ClientsDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      ClientsDependenciesProvider,
      { dependencies },
      children,
    );
  };
}

describe("useTallas", () => {
  beforeEach(() => {
    mockFindByClientId.mockReset();
    mockUpsert.mockReset();
    mockDelete.mockReset();
  });

  it("al montar con clientId llama findByClientId y popula tallas", async () => {
    // Arrange
    const talla = makeTalla();
    mockFindByClientId.mockResolvedValueOnce([talla]);

    // Act
    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(result.current.tallas).toEqual([talla]);
    expect(mockFindByClientId).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("isLoading es true durante carga inicial y false al terminar", async () => {
    // Arrange
    let resolvePromise!: (value: ClientTalla[]) => void;
    const deferred = new Promise<ClientTalla[]>((resolve) => {
      resolvePromise = resolve;
    });
    mockFindByClientId.mockReturnValueOnce(deferred);

    // Act
    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });

    // Assert — loading starts true
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise([]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("upsertTalla sin id llama repo.upsert con CreateTallaDTO y recarga la lista", async () => {
    // Arrange
    const talla = makeTalla();
    mockFindByClientId.mockResolvedValue([talla]);
    mockUpsert.mockResolvedValueOnce(talla);

    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    let output: ClientTalla | null = null;
    await act(async () => {
      output = await result.current.upsertTalla({
        clientId: CLIENT_ID,
        type: "camisa",
        value: "M",
      });
    });

    // Assert
    expect(output).toEqual(talla);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    // findByClientId: llamado en mount + reload post-upsert
    expect(mockFindByClientId).toHaveBeenCalledTimes(2);
  });

  it("upsertTalla con id llama repo.upsert con UpdateTallaDTO", async () => {
    // Arrange
    const talla = makeTalla({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    mockFindByClientId.mockResolvedValue([talla]);
    mockUpsert.mockResolvedValueOnce(talla);

    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.upsertTalla({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        clientId: CLIENT_ID,
        type: "camisa",
        value: "L",
      });
    });

    // Assert
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        value: "L",
      }),
    );
  });

  it("upsertTalla con value vacío retorna null y setea error sin llamar al repositorio", async () => {
    // Arrange
    mockFindByClientId.mockResolvedValue([]);

    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    let output: ClientTalla | null | undefined;
    await act(async () => {
      output = await result.current.upsertTalla({
        clientId: CLIENT_ID,
        type: "camisa",
        value: "",
      });
    });

    // Assert
    expect(output).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("deleteTalla llama repo.delete con el id correcto y retorna true", async () => {
    // Arrange
    mockFindByClientId.mockResolvedValue([]);
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteTalla(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      );
    });

    // Assert
    expect(deleted).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("deleteTalla retorna false y expone error cuando el repositorio falla", async () => {
    // Arrange
    mockFindByClientId.mockResolvedValue([]);
    mockDelete.mockRejectedValueOnce(new Error("db error"));

    const { result } = renderHook(() => useTallas(CLIENT_ID), {
      wrapper: createWrapper({
        clientRepository: noopClientRepository,
        measurementRepository: noopMeasurementRepository,
        tallaRepository: mockTallaRepository,
      }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteTalla(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      );
    });

    // Assert
    expect(deleted).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
