import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { ResolvedIdentity } from "../../auth/hooks/useIdentityGate";
import type { CreateScheduleEventDTO, ScheduleEvent } from "../domain/events";
import type { Schedule } from "../domain/types";
import { useScheduleStatusActions } from "./useScheduleStatusActions";

const mockGetById = jest.fn<(id: string) => Promise<Schedule | null>>();
const mockMarkReady = jest.fn<(id: string) => Promise<Schedule>>();
const mockMarkDelivered = jest.fn<(id: string) => Promise<Schedule>>();
const mockApplyManualCorrection =
  jest.fn<(id: string, status: Schedule["status"]) => Promise<Schedule>>();
const mockUpdate =
  jest.fn<(id: string, data: { operarioId?: string }) => Promise<Schedule>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getById: (id: string) => mockGetById(id),
    markReady: (id: string) => mockMarkReady(id),
    markDelivered: (id: string) => mockMarkDelivered(id),
    applyManualCorrection: (id: string, status: Schedule["status"]) =>
      mockApplyManualCorrection(id, status),
    update: (id: string, data: { operarioId?: string }) =>
      mockUpdate(id, data),
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
  id: "schedule-1",
  clientId: "client-1",
  date: "2026-08-10",
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "en_proceso",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("useScheduleStatusActions", () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockMarkReady.mockReset();
    mockMarkDelivered.mockReset();
    mockApplyManualCorrection.mockReset();
    mockUpdate.mockReset();
    mockCreateEvent.mockReset();
    mockGetById.mockResolvedValue(baseSchedule);
  });

  describe("markReady", () => {
    it("marca listo para entregar y registra un evento 'status_manual'", async () => {
      const updated: Schedule = {
        ...baseSchedule,
        status: "listo_para_entregar",
        readyAt: "2026-08-01T12:00:00.000Z",
      };
      mockMarkReady.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      let resolved: Schedule | null = null;
      await act(async () => {
        resolved = await result.current.markReady();
      });

      expect(mockMarkReady).toHaveBeenCalledWith(baseSchedule.id);
      expect(resolved).toEqual(updated);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: baseSchedule.id,
          actorId: actorProfile.id,
          action: "status_manual",
          changes: JSON.stringify({
            status: { before: "en_proceso", after: "listo_para_entregar" },
          }),
          identityVerified: true,
        }),
      );
      expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    });
  });

  describe("markDelivered", () => {
    it("marca entregado desde cualquier estado previo y registra el evento", async () => {
      const updated: Schedule = {
        ...baseSchedule,
        status: "entregado",
        deliveredAt: "2026-08-01T12:00:00.000Z",
      };
      mockMarkDelivered.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      await act(async () => {
        await result.current.markDelivered();
      });

      expect(mockMarkDelivered).toHaveBeenCalledWith(baseSchedule.id);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "status_manual" }),
      );
    });
  });

  describe("applyCorrection", () => {
    it("registra la corrección como 'status_manual_correction', distinta de un avance normal", async () => {
      const updated: Schedule = { ...baseSchedule, status: "pendiente" };
      mockApplyManualCorrection.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      await act(async () => {
        await result.current.applyCorrection("pendiente");
      });

      expect(mockApplyManualCorrection).toHaveBeenCalledWith(
        baseSchedule.id,
        "pendiente",
      );
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_manual_correction",
          changes: JSON.stringify({
            status: { before: "en_proceso", after: "pendiente" },
          }),
        }),
      );
    });

    it("enriquece el diff con date/operarioId cuando la corrección los toca", async () => {
      // baseSchedule ya tiene date/operarioId (via mockGetById) — corregir a
      // "pendiente" los limpia (ver resolveManualCorrectionFields), así que
      // el evento de auditoría debe incluir esas dos claves además de status.
      mockGetById.mockResolvedValueOnce({
        ...baseSchedule,
        date: "2026-08-10",
        operarioId: "op-1",
        status: "en_proceso",
      });
      const updated: Schedule = {
        ...baseSchedule,
        date: undefined,
        operarioId: undefined,
        status: "pendiente",
      };
      mockApplyManualCorrection.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      await act(async () => {
        await result.current.applyCorrection("pendiente");
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_manual_correction",
          changes: JSON.stringify({
            date: { before: "2026-08-10", after: null },
            operarioId: { before: "op-1", after: null },
            status: { before: "en_proceso", after: "pendiente" },
          }),
        }),
      );
    });

    it("no agrega claves de más si la corrección no toca ningún otro campo", async () => {
      // baseSchedule ya no tiene date/operarioId de más para limpiar en este
      // caso puntual (mismo clientId/category/etc. antes y después).
      mockGetById.mockResolvedValueOnce({
        ...baseSchedule,
        date: undefined,
        operarioId: undefined,
        status: "en_proceso",
      });
      const updated: Schedule = {
        ...baseSchedule,
        date: undefined,
        operarioId: undefined,
        status: "pendiente",
      };
      mockApplyManualCorrection.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      await act(async () => {
        await result.current.applyCorrection("pendiente");
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: JSON.stringify({
            status: { before: "en_proceso", after: "pendiente" },
          }),
        }),
      );
    });
  });

  describe("assignOperario", () => {
    it("asigna el operario vía update() y registra el cambio como 'status_auto' cuando el estado realmente cambia", async () => {
      mockGetById.mockResolvedValueOnce({
        ...baseSchedule,
        status: "agendado",
        operarioId: undefined,
      });
      const updated: Schedule = {
        ...baseSchedule,
        operarioId: "operario-1",
        status: "en_proceso",
      };
      mockUpdate.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      let resolved: Schedule | null = null;
      await act(async () => {
        resolved = await result.current.assignOperario("operario-1");
      });

      expect(mockUpdate).toHaveBeenCalledWith(baseSchedule.id, {
        operarioId: "operario-1",
      });
      expect(resolved).toEqual(updated);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_auto",
          changes: JSON.stringify({
            status: { before: "agendado", after: "en_proceso" },
          }),
        }),
      );
      expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    });

    it("no registra ningún evento si reasignar el operario no cambia el estado", async () => {
      // baseSchedule ya está "en_proceso" (mockGetById por defecto) —
      // reasignar a otro operario no mueve el estado, así que no debe
      // quedar un evento fantasma de "cambio de estado".
      const updated: Schedule = {
        ...baseSchedule,
        operarioId: "operario-2",
        status: "en_proceso",
      };
      mockUpdate.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      let resolved: Schedule | null = null;
      await act(async () => {
        resolved = await result.current.assignOperario("operario-2");
      });

      expect(resolved).toEqual(updated);
      expect(mockCreateEvent).not.toHaveBeenCalled();
      expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
    });

    it("pide identidad antes de asignar, y no asigna si se cancela", async () => {
      const identityGate = makeIdentityGate({
        requireIdentity: jest.fn(async () => Promise.resolve(null)),
      });
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      let resolved: Schedule | null = baseSchedule;
      await act(async () => {
        resolved = await result.current.assignOperario("operario-1");
      });

      expect(resolved).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("permite quitar el operario asignado con undefined", async () => {
      const updated: Schedule = { ...baseSchedule, operarioId: undefined };
      mockUpdate.mockResolvedValueOnce(updated);
      const identityGate = makeIdentityGate();
      const { result } = renderHook(() =>
        useScheduleStatusActions(baseSchedule.id, identityGate),
      );

      await act(async () => {
        await result.current.assignOperario(undefined);
      });

      expect(mockUpdate).toHaveBeenCalledWith(baseSchedule.id, {
        operarioId: undefined,
      });
    });
  });

  it("no guarda nada si no se pudo confirmar la identidad", async () => {
    const identityGate = makeIdentityGate({
      requireIdentity: jest.fn(async () => Promise.resolve(null)),
    });
    const { result } = renderHook(() =>
      useScheduleStatusActions(baseSchedule.id, identityGate),
    );

    let resolved: Schedule | null = baseSchedule;
    await act(async () => {
      resolved = await result.current.markReady();
    });

    expect(resolved).toBeNull();
    expect(mockMarkReady).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "No se pudo confirmar tu identidad. Intenta de nuevo.",
    );
  });

  it("marca error si la operación falla", async () => {
    mockMarkReady.mockRejectedValueOnce(new Error("boom"));
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleStatusActions(baseSchedule.id, identityGate),
    );

    let resolved: Schedule | null = baseSchedule;
    await act(async () => {
      resolved = await result.current.markReady();
    });

    expect(resolved).toBeNull();
    expect(result.current.error).toBe(
      "No se pudo actualizar el turno. Intenta nuevamente.",
    );
  });

  it("devuelve el turno actualizado aunque falle el registro de auditoría (la mutación ya se guardó)", async () => {
    const updated: Schedule = {
      ...baseSchedule,
      status: "listo_para_entregar",
    };
    mockMarkReady.mockResolvedValueOnce(updated);
    mockCreateEvent.mockRejectedValueOnce(new Error("network blip"));
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleStatusActions(baseSchedule.id, identityGate),
    );

    let resolved: Schedule | null = null;
    await act(async () => {
      resolved = await result.current.markReady();
    });

    expect(resolved).toEqual(updated);
    expect(result.current.error).toBeNull();
    expect(identityGate.releaseIdentity).toHaveBeenCalledTimes(1);
  });

  it("ignora una segunda acción concurrente mientras la primera sigue en curso", async () => {
    let resolveMarkReady: ((schedule: Schedule) => void) | undefined;
    mockMarkReady.mockImplementationOnce(
      () =>
        new Promise<Schedule>((resolve) => {
          resolveMarkReady = resolve;
        }),
    );
    const identityGate = makeIdentityGate();
    const { result } = renderHook(() =>
      useScheduleStatusActions(baseSchedule.id, identityGate),
    );

    let firstResult: Promise<Schedule | null> = Promise.resolve(null);
    let secondResult: Schedule | null = baseSchedule;
    await act(async () => {
      firstResult = result.current.markReady();
      secondResult = await result.current.markReady();
    });

    expect(secondResult).toBeNull();
    expect(mockMarkReady).toHaveBeenCalledTimes(1);

    resolveMarkReady?.({ ...baseSchedule, status: "listo_para_entregar" });
    await act(async () => {
      await firstResult;
    });
  });
});
