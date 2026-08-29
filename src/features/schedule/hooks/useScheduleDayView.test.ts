import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Schedule } from "../domain/types";
import { useScheduleDayView } from "./useScheduleDayView";

const mockGetByDate = jest.fn<(date: string) => Promise<Schedule[]>>();
const mockGetWithoutDate = jest.fn<() => Promise<Schedule[]>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getByDate: (date: string) => mockGetByDate(date),
    getWithoutDate: () => mockGetWithoutDate(),
  }),
}));

const scheduledOne: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  date: "2026-08-10",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const pendingOne: Schedule = {
  id: "schedule-2",
  clientId: "client-2",
  isPriority: false,
  category: "arreglo",
  status: "pendiente",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("useScheduleDayView", () => {
  beforeEach(() => {
    mockGetByDate.mockReset();
    mockGetWithoutDate.mockReset();
  });

  it("carga los turnos del día y los pendientes en paralelo", async () => {
    mockGetByDate.mockResolvedValueOnce([scheduledOne]);
    mockGetWithoutDate.mockResolvedValueOnce([pendingOne]);

    const { result } = renderHook(() => useScheduleDayView("2026-08-10"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetByDate).toHaveBeenCalledWith("2026-08-10");
    expect(result.current.dateSchedules).toEqual([scheduledOne]);
    expect(result.current.pendingSchedules).toEqual([pendingOne]);
    expect(result.current.error).toBeNull();
  });

  it("recarga cuando cambia la fecha", async () => {
    mockGetByDate.mockResolvedValue([]);
    mockGetWithoutDate.mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ date }: { date: string }) => useScheduleDayView(date),
      { initialProps: { date: "2026-08-10" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ date: "2026-08-11" });

    await waitFor(() =>
      expect(mockGetByDate).toHaveBeenCalledWith("2026-08-11"),
    );
  });

  it("marca error si falla la carga", async () => {
    mockGetByDate.mockRejectedValueOnce(new Error("boom"));
    mockGetWithoutDate.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useScheduleDayView("2026-08-10"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar la agenda.");
  });

  it("descarta una respuesta obsoleta si una carga más nueva ya se disparó (doble tap cambiando de fecha)", async () => {
    // La primera carga (día 10) queda pendiente; se dispara una segunda
    // (día 11) que resuelve ANTES. Cuando la primera finalmente resuelve,
    // su resultado no debe pisar el estado ya actualizado por la segunda.
    let resolveFirst: ((schedules: Schedule[]) => void) | undefined;
    const firstPromise = new Promise<Schedule[]>((resolve) => {
      resolveFirst = resolve;
    });

    mockGetByDate.mockImplementationOnce(() => firstPromise);
    mockGetWithoutDate.mockResolvedValueOnce([]);

    const { result, rerender } = renderHook(
      ({ date }: { date: string }) => useScheduleDayView(date),
      { initialProps: { date: "2026-08-10" } },
    );

    // Se dispara la segunda carga (día 11) antes de que la primera resuelva.
    mockGetByDate.mockResolvedValueOnce([scheduledOne]);
    mockGetWithoutDate.mockResolvedValueOnce([pendingOne]);
    rerender({ date: "2026-08-11" });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dateSchedules).toEqual([scheduledOne]);

    // Ahora resuelve la primera carga (obsoleta) — no debe sobreescribir
    // el estado que ya corresponde al día 11.
    await act(async () => {
      resolveFirst?.([]);
      await Promise.resolve();
    });

    expect(result.current.dateSchedules).toEqual([scheduledOne]);
    expect(result.current.pendingSchedules).toEqual([pendingOne]);
    expect(result.current.isLoading).toBe(false);
  });

  it("reload() vuelve a consultar ambos repositorios", async () => {
    mockGetByDate.mockResolvedValue([]);
    mockGetWithoutDate.mockResolvedValue([]);

    const { result } = renderHook(() => useScheduleDayView("2026-08-10"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetByDate.mockClear();
    await act(async () => {
      await result.current.reload();
    });

    expect(mockGetByDate).toHaveBeenCalledWith("2026-08-10");
  });
});
