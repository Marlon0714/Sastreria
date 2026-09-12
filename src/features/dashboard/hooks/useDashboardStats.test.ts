import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../../schedule/domain/types";
import { useDashboardStats } from "./useDashboardStats";

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

describe("useDashboardStats", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 15)); // 2026-08-15, sábado
    mockGetAll.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("carga schedules y clients una sola vez al montar", async () => {
    mockGetAll.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("arranca en modo 'semana' (Decisión ya confirmada: sin cambios en el arranque)", async () => {
    mockGetAll.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.mode).toBe("semana");
  });

  it("navegar de periodo NO dispara un nuevo getAll()", async () => {
    mockGetAll.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetAll.mockClear();
    act(() => {
      result.current.goToNext();
    });

    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it("recordatorios y vencidos/por vencer NO cambian al navegar de periodo (son globales)", async () => {
    // Turno vencido agendado en un periodo muy anterior al seleccionado:
    // su `readyAt` (backlog global) es independiente de su `date`.
    mockGetAll.mockResolvedValue([
      makeSchedule({
        id: "s-overdue",
        clientId: "client-1",
        date: "2026-01-05",
        status: "listo_para_entregar",
        readyAt: "2026-06-01T12:00:00.000Z", // ~75 días antes de hoy
      }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueCount).toBe(1);
    expect(result.current.reminders).toHaveLength(1);

    act(() => {
      result.current.setMode("mes");
    });
    act(() => {
      result.current.goToNext();
    });

    expect(result.current.overdueCount).toBe(1);
    expect(result.current.upcomingCount).toBe(0);
    expect(result.current.reminders).toHaveLength(1);
  });

  it("'no realizados' SÍ cambia al navegar de semana (se filtra por date)", async () => {
    mockGetAll.mockResolvedValue([
      // Semana actual (contiene 2026-08-15): un turno no realizado.
      makeSchedule({ id: "s-current-week", date: "2026-08-11", status: "agendado" }),
      // Semana siguiente: ningún turno no realizado (todo en el futuro).
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notRealizedInPeriod).toBe(1);

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.notRealizedInPeriod).toBe(0);
  });

  it("modo 'dia': agrega solo los turnos de ese día exacto", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: "2026-08-15", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-16", status: "agendado" }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setMode("dia");
    });

    expect(result.current.periodStatusCounts.total).toBe(1);
  });

  it("modo 'mes': agrega todos los turnos del mes que contiene el ancla", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: "2026-08-01", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-31", status: "agendado" }),
      makeSchedule({ id: "s-3", date: "2026-09-01", status: "agendado" }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setMode("mes");
    });

    expect(result.current.periodStatusCounts.total).toBe(2);
  });

  it("modo 'rango' completo: agrega los turnos dentro del rango elegido", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
      makeSchedule({ id: "s-2", date: "2026-08-25", status: "agendado" }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setMode("rango");
    });
    act(() => {
      result.current.setCustomRangeStart("2026-08-01");
      result.current.setCustomRangeEnd("2026-08-15");
    });

    expect(result.current.periodStatusCounts.total).toBe(1);
    expect(result.current.isRangeIncomplete).toBe(false);
  });

  it("modo 'rango' incompleto: no recalcula agregados, expone isRangeIncomplete", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: "2026-08-10", status: "agendado" }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setMode("rango");
    });

    expect(result.current.range).toBeNull();
    expect(result.current.isRangeIncomplete).toBe(true);
    expect(result.current.periodStatusCounts.total).toBe(0);
    expect(result.current.periodMoneyTotals.totalPrice).toBe(0);
  });

  it("dailyWorkload es [] fuera del modo 'semana'", async () => {
    mockGetAll.mockResolvedValue([
      makeSchedule({ id: "s-1", date: "2026-08-15", status: "agendado" }),
    ]);

    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dailyWorkload).toHaveLength(7);

    act(() => {
      result.current.setMode("dia");
    });
    expect(result.current.dailyWorkload).toEqual([]);

    act(() => {
      result.current.setMode("mes");
    });
    expect(result.current.dailyWorkload).toEqual([]);

    act(() => {
      result.current.setMode("rango");
    });
    expect(result.current.dailyWorkload).toEqual([]);
  });

  it("marca error si falla la carga", async () => {
    mockGetAll.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar el resumen del negocio.");
  });

  it("reload() vuelve a consultar ambos repositorios", async () => {
    mockGetAll.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats());
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
