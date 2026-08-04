import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { ResolvedIdentity } from "../../auth/hooks/useIdentityGate";
import type { CreateScheduleEventDTO, ScheduleEvent } from "../domain/events";
import type { Schedule } from "../domain/types";
import { useDeleteSchedule } from "./useDeleteSchedule";

const mockDelete = jest.fn<(id: string) => Promise<void>>();
const mockGetById = jest.fn<(id: string) => Promise<Schedule | null>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    delete: (id: string) => mockDelete(id),
    getById: (id: string) => mockGetById(id),
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

const existingSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  isPriority: false,
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("useDeleteSchedule", () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockGetById.mockReset();
    mockGetById.mockResolvedValue(existingSchedule);
    mockCreateEvent.mockReset();
    mockCreateEvent.mockResolvedValue({} as ScheduleEvent);
  });

  it("returns true, borra el turno y registra un evento 'deleted' con el actor resuelto", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() => useDeleteSchedule(identityGate));

    let success = false;
    await act(async () => {
      success = await result.current.deleteSchedule("schedule-1");
    });

    expect(success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("schedule-1");
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: "schedule-1",
        actorId: "user-1",
        actorDisplayName: "María Gómez",
        action: "deleted",
        identityVerified: true,
      }),
    );
    expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it("no borra nada ni crea evento si se cancela la identidad", async () => {
    const identityGate = makeIdentityGate({
      requireIdentity: jest.fn(async () => Promise.resolve(null)),
    });
    const { result } = renderHook(() => useDeleteSchedule(identityGate));

    let success = true;
    await act(async () => {
      success = await result.current.deleteSchedule("schedule-1");
    });

    expect(success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockCreateEvent).not.toHaveBeenCalled();
    expect(identityGate.releaseIdentity).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "No se pudo confirmar tu identidad. Intenta de nuevo.",
    );
  });

  it("returns false and sets error on failure, pero igual libera la identidad ya resuelta", async () => {
    mockDelete.mockRejectedValueOnce(new Error("boom"));
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() => useDeleteSchedule(identityGate));

    let success = true;
    await act(async () => {
      success = await result.current.deleteSchedule("schedule-1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe(
      "No se pudo eliminar el turno. Intenta nuevamente.",
    );
    expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
  });

  it("ignora una segunda llamada concurrente mientras la primera sigue en curso", async () => {
    let resolveDelete: (() => void) | undefined;
    mockDelete.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() => useDeleteSchedule(identityGate));

    let firstResult: Promise<boolean> = Promise.resolve(false);
    let secondResult = false;
    await act(async () => {
      firstResult = result.current.deleteSchedule("schedule-1");
      secondResult = await result.current.deleteSchedule("schedule-1");
    });

    expect(secondResult).toBe(false);
    expect(mockDelete).toHaveBeenCalledTimes(1);

    resolveDelete?.();
    await act(async () => {
      await firstResult;
    });
  });
});
