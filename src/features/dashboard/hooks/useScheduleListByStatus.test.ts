import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../../schedule/domain/types";
import { useScheduleListByStatus } from "./useScheduleListByStatus";

const mockGetAll = jest.fn<() => Promise<Schedule[]>>();
const mockFindAll = jest.fn<() => Promise<Client[]>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getAll: () => mockGetAll(),
  }),
}));

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({ findAll: () => mockFindAll() }),
}));

function makeSchedule(overrides: Partial<Schedule> & { id: string }): Schedule {
  return {
    isPriority: false,
    isOwnerFlagged: false,
    category: "arreglo",
    status: "agendado",
    statusLocked: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

function makeClient(overrides: Partial<Client> & { id: string }): Client {
  return {
    firstName: "Ana",
    lastName: "Torres",
    phone: "3000000000",
    notes: null,
    measurements: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

describe("useScheduleListByStatus", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 15)); // 2026-08-15
    mockGetAll.mockReset();
    mockFindAll.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("expone los items correctos para un bucket de status dentro de un rango", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({
        id: "s-1",
        date: "2026-08-11",
        status: "agendado",
        clientId: "client-1",
      }),
      makeSchedule({ id: "s-2", date: "2026-08-11", status: "entregado" }),
    ]);
    mockFindAll.mockResolvedValue([
      makeClient({ id: "client-1", firstName: "Ana", lastName: "Torres" }),
    ]);

    const { result } = renderHook(() =>
      useScheduleListByStatus("agendado", "2026-08-10", "2026-08-16"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      schedule: expect.objectContaining({ id: "s-1" }),
      clientLabel: "Ana Torres",
    });
  });

  it("bucket 'sin_fecha_global' ignora startDate/endDate undefined", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: undefined }),
      makeSchedule({ id: "s-2", date: "2026-08-10" }),
    ]);
    mockFindAll.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useScheduleListByStatus("sin_fecha_global", undefined, undefined),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items.map((item) => item.schedule.id)).toEqual([
      "s-1",
    ]);
  });

  it("marca error si falla la carga", async () => {
    mockGetAll.mockRejectedValue(new Error("boom"));
    mockFindAll.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useScheduleListByStatus("total", "2026-08-10", "2026-08-16"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar la lista de turnos.");
    expect(result.current.items).toEqual([]);
  });

  it("reload() vuelve a pegarle a ambos repositorios", async () => {
    mockGetAll.mockResolvedValue([]);
    mockFindAll.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useScheduleListByStatus("total", "2026-08-10", "2026-08-16"),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetAll.mockClear();
    mockFindAll.mockClear();
    await act(async () => {
      await result.current.reload();
    });

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockFindAll).toHaveBeenCalledTimes(1);
  });
});
