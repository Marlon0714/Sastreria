import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Schedule } from "../domain/types";
import { useScheduleList } from "./useScheduleList";

const mockGetAll = jest.fn<() => Promise<Schedule[]>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getAll: () => mockGetAll(),
  }),
}));

const baseSchedule: Schedule = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  clientId: "22222222-2222-4222-8222-222222222222",
  notes: "Ajuste de traje",
  status: "agendado",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("useScheduleList", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
  });

  it("loads schedules on mount", async () => {
    mockGetAll.mockResolvedValueOnce([baseSchedule]);

    const { result } = renderHook(() => useScheduleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(result.current.schedules).toEqual([baseSchedule]);
    expect(result.current.error).toBeNull();
  });

  it("exposes error and recovers after reload", async () => {
    mockGetAll
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([baseSchedule]);

    const { result } = renderHook(() => useScheduleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("No se pudo cargar la agenda.");

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockGetAll).toHaveBeenCalledTimes(2);
    expect(result.current.schedules).toEqual([baseSchedule]);
  });
});
