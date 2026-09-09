import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../../schedule/domain/types";
import { useIdentityStore } from "../../../shared/state/identityStore";
import { useMyActivity } from "./useMyActivity";

const mockGetAll = jest.fn<() => Promise<Schedule[]>>();
const mockUpdate =
  jest.fn<(id: string, data: unknown) => Promise<Schedule>>();
const mockFindAll = jest.fn<() => Promise<Client[]>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getAll: () => mockGetAll(),
    update: (id: string, data: unknown) => mockUpdate(id, data),
  }),
}));

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({ findAll: () => mockFindAll() }),
}));

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  operarioId: "op-1",
  price: 40000,
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "listo_para_entregar",
  statusLocked: false,
  readyAt: "2026-08-15T14:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-15T14:00:00.000Z",
  syncStatus: "pending",
};

const client = clientFactory({
  id: "client-1",
  firstName: "Ana",
  lastName: "Torres",
});

describe("useMyActivity", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockUpdate.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([client]);
    useIdentityStore.getState().reset();
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
  });

  it("incluye un turno listo/entregado ese día por el propio operario, con el nombre del cliente", async () => {
    mockGetAll.mockResolvedValue([baseSchedule]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.clientLabel).toBe("Ana Torres");
    expect(result.current.total).toBe(40000);
  });

  it("excluye turnos de OTRO operario", async () => {
    mockGetAll.mockResolvedValue([
      { ...baseSchedule, operarioId: "op-2" },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("excluye turnos que aún no están listos/entregados", async () => {
    mockGetAll.mockResolvedValue([
      { ...baseSchedule, status: "en_proceso", readyAt: undefined },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
  });

  it("agrupa por el día en que se marcó listo, no por la fecha agendada del turno", async () => {
    mockGetAll.mockResolvedValue([
      { ...baseSchedule, date: "2026-08-20", readyAt: "2026-08-15T14:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);

    const { result: otherDay } = renderHook(() => useMyActivity("2026-08-20"));
    await waitFor(() => expect(otherDay.current.isLoading).toBe(false));
    expect(otherDay.current.items).toHaveLength(0);
  });

  it("usa deliveredAt si el turno nunca pasó por listo_para_entregar", async () => {
    mockGetAll.mockResolvedValue([
      {
        ...baseSchedule,
        status: "entregado",
        readyAt: undefined,
        deliveredAt: "2026-08-16T09:00:00.000Z",
      },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-16"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
  });

  it("muestra 'Cliente eliminado' si el clientId ya no existe", async () => {
    mockFindAll.mockResolvedValue([]);
    mockGetAll.mockResolvedValue([baseSchedule]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items[0]!.clientLabel).toBe("Cliente eliminado");
  });

  it("muestra el nombre sin registrar cuando el turno no tiene clientId", async () => {
    mockGetAll.mockResolvedValue([
      { ...baseSchedule, clientId: undefined, unregisteredClientName: "Pedro" },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items[0]!.clientLabel).toBe("Pedro");
  });

  it("suma el total de los precios de todos los arreglos del día", async () => {
    mockGetAll.mockResolvedValue([
      baseSchedule,
      { ...baseSchedule, id: "schedule-2", price: 15000 },
    ]);

    const { result } = renderHook(() => useMyActivity("2026-08-15"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.total).toBe(55000);
  });

  describe("addPrice", () => {
    it("actualiza el precio del turno y recarga la lista", async () => {
      mockGetAll.mockResolvedValue([{ ...baseSchedule, price: undefined }]);
      mockUpdate.mockResolvedValue({ ...baseSchedule, price: 25000 });

      const { result } = renderHook(() => useMyActivity("2026-08-15"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = false;
      await act(async () => {
        ok = await result.current.addPrice("schedule-1", 25000);
      });

      expect(ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith("schedule-1", { price: 25000 });
      expect(mockGetAll).toHaveBeenCalledTimes(2);
    });

    it("retorna false y expone priceError (no error de pantalla completa) si falla", async () => {
      mockGetAll.mockResolvedValue([{ ...baseSchedule, price: undefined }]);
      mockUpdate.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useMyActivity("2026-08-15"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = true;
      await act(async () => {
        ok = await result.current.addPrice("schedule-1", 25000);
      });

      expect(ok).toBe(false);
      expect(result.current.priceError).toBe("No se pudo guardar el precio.");
      // El error de addPrice NUNCA debe tocar el `error` fatal de carga.
      expect(result.current.error).toBeNull();
    });

    it("limpia priceError en el siguiente intento", async () => {
      mockGetAll.mockResolvedValue([{ ...baseSchedule, price: undefined }]);
      mockUpdate.mockRejectedValueOnce(new Error("network error"));
      mockUpdate.mockResolvedValueOnce({ ...baseSchedule, price: 25000 });

      const { result } = renderHook(() => useMyActivity("2026-08-15"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addPrice("schedule-1", 25000);
      });
      expect(result.current.priceError).toBe("No se pudo guardar el precio.");

      let ok = false;
      await act(async () => {
        ok = await result.current.addPrice("schedule-1", 25000);
      });

      expect(ok).toBe(true);
      expect(result.current.priceError).toBeNull();
    });

    it("rechaza un precio negativo sin llamar al repositorio (priceError, no error fatal)", async () => {
      mockGetAll.mockResolvedValue([{ ...baseSchedule, price: undefined }]);

      const { result } = renderHook(() => useMyActivity("2026-08-15"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = true;
      await act(async () => {
        ok = await result.current.addPrice("schedule-1", -100);
      });

      expect(ok).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result.current.priceError).toBe(
        "El precio debe ser un número entero no negativo.",
      );
      expect(result.current.error).toBeNull();
    });

    it("rechaza un precio no entero sin llamar al repositorio", async () => {
      mockGetAll.mockResolvedValue([{ ...baseSchedule, price: undefined }]);

      const { result } = renderHook(() => useMyActivity("2026-08-15"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = true;
      await act(async () => {
        ok = await result.current.addPrice("schedule-1", 25.5);
      });

      expect(ok).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result.current.priceError).toBe(
        "El precio debe ser un número entero no negativo.",
      );
    });
  });
});
