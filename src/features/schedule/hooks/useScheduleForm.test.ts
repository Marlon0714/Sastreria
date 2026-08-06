import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ResolvedIdentity } from "../../auth/hooks/useIdentityGate";
import type { CreateScheduleEventDTO, ScheduleEvent } from "../domain/events";
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

const mockCreateEvent =
  jest.fn<(dto: CreateScheduleEventDTO) => Promise<ScheduleEvent>>();

jest.mock("../../../data/local/scheduleEventDependencies", () => ({
  getDefaultScheduleEventRepository: () => ({
    create: (dto: CreateScheduleEventDTO) => mockCreateEvent(dto),
    getByScheduleId: jest.fn(async () => Promise.resolve([])),
  }),
}));

const actorProfile = {
  id: "user-1",
  displayName: "María Gómez",
  role: "operario" as const,
  isSharedDevice: false,
};

const verifiedIdentity: ResolvedIdentity = {
  profile: actorProfile,
  verified: true,
};

function makeIdentityGate(
  overrides: Partial<{
    requireIdentity: () => Promise<ResolvedIdentity | null>;
    releaseIdentity: () => void;
  }> = {},
) {
  return {
    requireIdentity: jest.fn(async () => Promise.resolve(verifiedIdentity)),
    releaseIdentity: jest.fn(),
    ...overrides,
  };
}

const baseSchedule: Schedule = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  clientId: "22222222-2222-4222-8222-222222222222",
  notes: "Ajuste de traje",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
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
    mockCreateEvent.mockReset();
  });

  it("does not load anything when no scheduleId is provided", () => {
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() => useScheduleForm(undefined, identityGate));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.schedule).toBeNull();
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("loads the existing schedule when scheduleId is provided", async () => {
    mockGetById.mockResolvedValueOnce(baseSchedule);
    const identityGate = makeIdentityGate();

    const { result } = renderHook(() =>
      useScheduleForm(baseSchedule.id, identityGate),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetById).toHaveBeenCalledWith(baseSchedule.id);
    expect(result.current.schedule).toEqual(baseSchedule);
  });

  describe("submit — creación", () => {
    it("crea el turno y registra un evento 'created' con el actor resuelto", async () => {
      mockCreate.mockResolvedValueOnce(baseSchedule);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleForm(undefined, identityGate),
      );

      let submitted: Schedule | null = null;
      await act(async () => {
        submitted = await result.current.submit(input);
      });

      expect(mockCreate).toHaveBeenCalledWith(input);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(submitted).toEqual(baseSchedule);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: baseSchedule.id,
          actorId: actorProfile.id,
          actorDisplayName: actorProfile.displayName,
          action: "created",
          identityVerified: true,
        }),
      );
      expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    });

    it("no guarda nada si no se pudo confirmar la identidad (PIN cancelado)", async () => {
      const identityGate = makeIdentityGate({
        requireIdentity: jest.fn(async () => Promise.resolve(null)),
      });
      const { result } = renderHook(() =>
        useScheduleForm(undefined, identityGate),
      );

      let submitted: Schedule | null = baseSchedule;
      await act(async () => {
        submitted = await result.current.submit(input);
      });

      expect(submitted).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.current.error).toBe(
        "No se pudo confirmar tu identidad. Intenta de nuevo.",
      );
    });
  });

  describe("submit — actualización", () => {
    it("actualiza el turno y registra un evento 'updated' con el diff de campos", async () => {
      mockGetById.mockResolvedValueOnce(baseSchedule);
      const updated: Schedule = { ...baseSchedule, notes: "Camisa nueva" };
      mockUpdate.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleForm(baseSchedule.id, identityGate),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit({ ...input, notes: "Camisa nueva" });
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updated",
          changes: JSON.stringify({
            notes: { before: "Ajuste de traje", after: "Camisa nueva" },
          }),
        }),
      );
    });

    it("registra un evento 'status_auto' adicional cuando el status cambia por derivación", async () => {
      mockGetById.mockResolvedValueOnce({
        ...baseSchedule,
        operarioId: undefined,
        status: "agendado",
      });
      const updated: Schedule = {
        ...baseSchedule,
        operarioId: "op-1",
        status: "en_proceso",
      };
      mockUpdate.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleForm(baseSchedule.id, identityGate),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit({ ...input, operarioId: "op-1" });
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_auto",
          changes: JSON.stringify({
            status: { before: "agendado", after: "en_proceso" },
          }),
        }),
      );
      expect(mockCreateEvent).toHaveBeenCalledTimes(2); // "updated" (operarioId) + "status_auto"
    });

    it("no registra ningún evento si nada cambió", async () => {
      mockGetById.mockResolvedValueOnce(baseSchedule);
      mockUpdate.mockResolvedValueOnce(baseSchedule);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleForm(baseSchedule.id, identityGate),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit(input);
      });

      expect(mockCreateEvent).not.toHaveBeenCalled();
      expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    });
  });

  it("submit sets an error and returns null when it fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("boom"));
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleForm(undefined, identityGate),
    );

    let submitted: Schedule | null = baseSchedule;
    await act(async () => {
      submitted = await result.current.submit(input);
    });

    expect(submitted).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo guardar el turno. Intenta nuevamente.",
    );
  });

  it("libera la identidad aunque falle la creación del evento tras una mutación exitosa", async () => {
    mockCreate.mockResolvedValueOnce(baseSchedule);
    mockCreateEvent.mockRejectedValueOnce(new Error("network blip"));
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleForm(undefined, identityGate),
    );

    let submitted: Schedule | null = null;
    await act(async () => {
      submitted = await result.current.submit(input);
    });

    expect(submitted).toBeNull();
    expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
  });

  it("ignora un segundo submit concurrente mientras el primero sigue en curso", async () => {
    let resolveCreate: ((schedule: Schedule) => void) | undefined;
    mockCreate.mockImplementationOnce(
      () =>
        new Promise<Schedule>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleForm(undefined, identityGate),
    );

    let firstResult: Promise<Schedule | null> = Promise.resolve(null);
    let secondResult: Schedule | null = baseSchedule;
    await act(async () => {
      firstResult = result.current.submit(input);
      secondResult = await result.current.submit(input);
    });

    expect(secondResult).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(1);

    resolveCreate?.(baseSchedule);
    await act(async () => {
      await firstResult;
    });
  });
});
