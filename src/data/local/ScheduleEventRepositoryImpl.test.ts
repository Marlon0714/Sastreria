import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ScheduleEventRepositoryImpl } from "./ScheduleEventRepositoryImpl";
import type { CreateScheduleEventDTO } from "../../features/schedule/domain/events";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
};

const mockGenerateDomainUuid = jest.fn<() => string>();

jest.mock("./database", () => ({
  getDatabase: () => mockDatabase,
}));

jest.mock("../../features/clients/domain/types", () => ({
  generateDomainUuid: () => mockGenerateDomainUuid(),
}));

const baseDto: CreateScheduleEventDTO = {
  scheduleId: "schedule-1",
  actorId: "operario-1",
  actorDisplayName: "María Gómez",
  action: "updated",
  changes: JSON.stringify({ price: { before: null, after: 15000 } }),
  identityVerified: true,
};

describe("ScheduleEventRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockGenerateDomainUuid.mockReset();
    mockGenerateDomainUuid.mockReturnValue("event-1");
  });

  describe("create", () => {
    it("inserta el evento con los parámetros en el orden correcto y coerciona identityVerified a 1", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      const repository = new ScheduleEventRepositoryImpl();

      const result = await repository.create(baseDto);

      expect(result).toMatchObject({
        id: "event-1",
        scheduleId: "schedule-1",
        actorId: "operario-1",
        actorDisplayName: "María Gómez",
        action: "updated",
        changes: baseDto.changes,
        identityVerified: true,
        syncStatus: "pending",
      });
      expect(result.createdAt).toBe(result.updatedAt);

      const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(sql).toContain("INSERT INTO schedule_events");
      expect(params).toEqual([
        "event-1",
        "schedule-1",
        "operario-1",
        "María Gómez",
        "updated",
        baseDto.changes,
        1,
        result.createdAt,
        "pending",
      ]);
    });

    it("coerciona identityVerified=false a 0 y changes=undefined a null", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      const repository = new ScheduleEventRepositoryImpl();

      await repository.create({
        ...baseDto,
        action: "deleted",
        changes: undefined,
        identityVerified: false,
      });

      const [, , , , , , changesParam, identityVerifiedParam] =
        mockRunAsync.mock.calls[0] ?? [];
      expect(changesParam).toBeNull();
      expect(identityVerifiedParam).toBe(0);
    });

    it("notifica onWriteCommitted tras insertar", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleEventRepositoryImpl({ onWriteCommitted });

      await repository.create(baseDto);

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });
  });

  describe("getByScheduleId", () => {
    it("mapea las filas ordenadas por created_at descendente, incluyendo el booleano identity_verified", async () => {
      mockGetAllAsync.mockResolvedValueOnce([
        {
          id: "event-2",
          schedule_id: "schedule-1",
          actor_id: "operario-1",
          actor_display_name: "María Gómez",
          action: "status_manual",
          changes: JSON.stringify({ status: { before: "agendado", after: "entregado" } }),
          identity_verified: 0,
          created_at: "2026-08-02T10:00:00.000Z",
          sync_status: "pending",
        },
      ]);
      const repository = new ScheduleEventRepositoryImpl();

      const result = await repository.getByScheduleId("schedule-1");

      expect(result).toEqual([
        {
          id: "event-2",
          scheduleId: "schedule-1",
          actorId: "operario-1",
          actorDisplayName: "María Gómez",
          action: "status_manual",
          changes: JSON.stringify({
            status: { before: "agendado", after: "entregado" },
          }),
          identityVerified: false,
          createdAt: "2026-08-02T10:00:00.000Z",
          updatedAt: "2026-08-02T10:00:00.000Z",
          syncStatus: "pending",
        },
      ]);

      const [sql, scheduleIdParam] = mockGetAllAsync.mock.calls[0] ?? [];
      expect(sql).toContain(
        "WHERE schedule_id = ? ORDER BY created_at DESC",
      );
      expect(scheduleIdParam).toBe("schedule-1");
    });

    it("retorna changes=undefined cuando la columna es null", async () => {
      mockGetAllAsync.mockResolvedValueOnce([
        {
          id: "event-3",
          schedule_id: "schedule-1",
          actor_id: "operario-1",
          actor_display_name: "María Gómez",
          action: "created",
          changes: null,
          identity_verified: 1,
          created_at: "2026-08-01T10:00:00.000Z",
          sync_status: "synced",
        },
      ]);
      const repository = new ScheduleEventRepositoryImpl();

      const [result] = await repository.getByScheduleId("schedule-1");

      expect(result?.changes).toBeUndefined();
    });

    it("retorna una lista vacía si el turno no tiene eventos", async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);
      const repository = new ScheduleEventRepositoryImpl();

      const result = await repository.getByScheduleId("schedule-sin-eventos");

      expect(result).toEqual([]);
    });
  });
});
