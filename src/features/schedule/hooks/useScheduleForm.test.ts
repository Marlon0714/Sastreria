import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { CreateScheduleDTO, Schedule } from "../domain/types";
import { useScheduleForm } from "./useScheduleForm";

const mockGetById = jest.fn<(id: string) => Promise<Schedule | null>>();
const mockCreate = jest.fn<(dto: CreateScheduleDTO) => Promise<Schedule>>();
const mockUpdate =
  jest.fn<(id: string, dto: CreateScheduleDTO) => Promise<Schedule>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getById: (id: string) => mockGetById(id),
    create: (dto: CreateScheduleDTO) => mockCreate(dto),
    update: (id: string, dto: CreateScheduleDTO) => mockUpdate(id, dto),
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

const input: CreateScheduleDTO = {
  date: "2026-08-10",
  time: "14:30",
  clientId: "22222222-2222-4222-8222-222222222222",
  notes: "Ajuste de traje",
};

describe("useScheduleForm", () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it("does not load anything when no scheduleId is provided", () => {
    const { result } = renderHook(() => useScheduleForm());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.schedule).toBeNull();
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("loads the existing schedule when scheduleId is provided", async () => {
    mockGetById.mockResolvedValueOnce(baseSchedule);

    const { result } = renderHook(() => useScheduleForm(baseSchedule.id));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetById).toHaveBeenCalledWith(baseSchedule.id);
    expect(result.current.schedule).toEqual(baseSchedule);
  });

  it("submit creates a schedule when no scheduleId is provided", async () => {
    mockCreate.mockResolvedValueOnce(baseSchedule);
    const { result } = renderHook(() => useScheduleForm());

    let submitted: Schedule | null = null;
    await act(async () => {
      submitted = await result.current.submit(input);
    });

    expect(mockCreate).toHaveBeenCalledWith(input);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(submitted).toEqual(baseSchedule);
  });

  it("submit updates the schedule when scheduleId is provided", async () => {
    mockGetById.mockResolvedValueOnce(baseSchedule);
    mockUpdate.mockResolvedValueOnce({ ...baseSchedule, status: "en_proceso" });
    const { result } = renderHook(() => useScheduleForm(baseSchedule.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let submitted: Schedule | null = null;
    await act(async () => {
      submitted = await result.current.submit(input);
    });

    expect(mockUpdate).toHaveBeenCalledWith(baseSchedule.id, input);
    expect(submitted).toMatchObject({ status: "en_proceso" });
  });

  it("submit sets an error and returns null when it fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useScheduleForm());

    let submitted: Schedule | null = baseSchedule;
    await act(async () => {
      submitted = await result.current.submit(input);
    });

    expect(submitted).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar el turno. Intenta nuevamente.",
    );
  });
});
