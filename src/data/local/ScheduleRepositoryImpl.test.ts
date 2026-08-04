import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { ScheduleRepositoryImpl } from "./ScheduleRepositoryImpl";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  withTransactionAsync: (callback: () => Promise<void>) => Promise<void>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();
const mockWithTransactionAsync =
  jest.fn<(callback: () => Promise<void>) => Promise<void>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
  getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetFirstAsync(sql, ...params) as Promise<T | null>,
  withTransactionAsync: (callback: () => Promise<void>) =>
    mockWithTransactionAsync(callback),
};

const mockGenerateDomainUuid = jest.fn<() => string>();

jest.mock("./database", () => ({
  getDatabase: () => mockDatabase,
}));

jest.mock("../../features/clients/domain/types", () => ({
  generateDomainUuid: () => mockGenerateDomainUuid(),
}));

const baseRow = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  client_id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  price: null,
  operario_id: null,
  notes: "Ajuste de traje",
  status: "agendado" as const,
  ready_at: null,
  delivered_at: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
  sync_status: "pending" as const,
};

describe("ScheduleRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockGetFirstAsync.mockReset();
    mockWithTransactionAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    mockWithTransactionAsync.mockImplementation(async (callback) => {
      await callback();
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-01T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("getAll retorna turnos mapeados ordenados por fecha/hora ascendente", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getAll();

    expect(result).toEqual([
      {
        id: baseRow.id,
        clientId: baseRow.client_id,
        date: baseRow.date,
        time: baseRow.time,
        price: undefined,
        operarioId: undefined,
        notes: baseRow.notes,
        status: baseRow.status,
        readyAt: undefined,
        deliveredAt: undefined,
        createdAt: baseRow.created_at,
        updatedAt: baseRow.updated_at,
        syncStatus: baseRow.sync_status,
      },
    ]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("ORDER BY date ASC, time ASC");
  });

  it("getById retorna null si no existe", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getById("nope");

    expect(result).toBeNull();
  });

  it("getByDate filtra por fecha exacta", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result).toHaveLength(1);
    const [sql, date] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE date = ?");
    expect(date).toBe("2026-08-10");
  });

  it("getByClient filtra por client_id", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByClient(baseRow.client_id);

    expect(result).toHaveLength(1);
    const [sql, clientId] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE client_id = ?");
    expect(clientId).toBe(baseRow.client_id);
  });

  it("getWithoutDate filtra los turnos sin fecha", async () => {
    mockGetAllAsync.mockResolvedValueOnce([{ ...baseRow, date: null }]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getWithoutDate();

    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBeUndefined();
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE date IS NULL");
  });

  describe("create", () => {
    it("deriva status 'pendiente' sin fecha ni operario y notifica onWriteCommitted", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.create({
        clientId: baseRow.client_id,
        notes: "Ajuste de traje",
      });

      expect(result).toEqual({
        id: baseRow.id,
        clientId: baseRow.client_id,
        date: undefined,
        time: undefined,
        price: undefined,
        operarioId: undefined,
        notes: "Ajuste de traje",
        status: "pendiente",
        readyAt: undefined,
        deliveredAt: undefined,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
        syncStatus: "pending",
      });
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("deriva status 'agendado' con fecha", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        date: "2026-08-10",
      });

      expect(result.status).toBe("agendado");
    });

    it("deriva status 'en_proceso' con operario asignado", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        operarioId: "op-1",
      });

      expect(result.status).toBe("en_proceso");
    });
  });

  describe("update", () => {
    it("lanza error si el turno no existe", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const repository = new ScheduleRepositoryImpl();

      await expect(
        repository.update("nope", { date: "2026-08-11" }),
      ).rejects.toThrow("Turno no encontrado");
    });

    it("recalcula status automáticamente y conserva campos no enviados", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseRow, status: "pendiente", date: null });
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.update(baseRow.id, {
        date: "2026-08-12",
      });

      expect(result.status).toBe("agendado");
      expect(result.date).toBe("2026-08-12");
      expect(result.notes).toBe(baseRow.notes);
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("no recalcula status si ya está en un estado pegajoso", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, {
        operarioId: "op-2",
      });

      expect(result.status).toBe("entregado");
    });
  });

  describe("markReady", () => {
    it("fija status listo_para_entregar y readyAt", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow);
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.markReady(baseRow.id);

      expect(result.status).toBe("listo_para_entregar");
      expect(result.readyAt).toBe("2026-08-01T10:00:00.000Z");
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });
  });

  describe("markDelivered", () => {
    it("fija status entregado y deliveredAt desde cualquier estado previo", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "pendiente",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.markDelivered(baseRow.id);

      expect(result.status).toBe("entregado");
      expect(result.deliveredAt).toBe("2026-08-01T10:00:00.000Z");
    });
  });

  describe("applyManualCorrection", () => {
    it("fija el status elegido sin ninguna regla", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "pendiente",
      );

      expect(result.status).toBe("pendiente");
    });
  });

  it("delete borra el turno y registra entrada en sync_delete_log dentro de una transacción", async () => {
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    mockRunAsync.mockResolvedValue({});
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

    await repository.delete(baseRow.id);

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(2);

    const [deleteSql, deleteId] = mockRunAsync.mock.calls[0] ?? [];
    expect(deleteSql).toContain("DELETE FROM schedules WHERE id = ?");
    expect(deleteId).toBe(baseRow.id);

    const [insertSql, ...insertParams] = mockRunAsync.mock.calls[1] ?? [];
    expect(insertSql).toContain("INSERT INTO sync_delete_log");
    expect(insertParams[0]).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(insertParams[1]).toBe("schedule");
    expect(insertParams[2]).toBe(baseRow.id);
    expect(insertParams[4]).toBe("pending");

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });
});
