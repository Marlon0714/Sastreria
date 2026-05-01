import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { SyncQueueRepository } from "./SyncQueueRepository";

interface MockDatabase {
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
}

const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();

const mockDatabase: MockDatabase = {
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
};

jest.mock("../local/database", () => {
  return {
    getDatabase: () => mockDatabase,
  };
});

describe("SyncQueueRepository", () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-30T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns pending and error items sorted by updatedAt ASC with global limit", async () => {
    mockGetAllAsync
      .mockResolvedValueOnce([
        {
          id: "c-2",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
          notes: null,
          created_at: "2026-04-30T08:00:00.000Z",
          updated_at: "2026-04-30T10:00:00.000Z",
          sync_status: "pending",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "cam-1",
          client_id: "c-2",
          espalda: 42,
          hombro: 14,
          talle_delantero: 43,
          talle_trasero: 41,
          distancia: 22,
          separacion: 10,
          pecho: 98,
          cintura: 80,
          base: 100,
          largo: 70,
          largo_manga: 62,
          ancho_manga: 32,
          escote: 18,
          notes: null,
          created_at: "2026-04-30T09:00:00.000Z",
          updated_at: "2026-04-30T09:00:00.000Z",
          sync_status: "error",
        },
      ])
      .mockResolvedValueOnce([]);

    const repository = new SyncQueueRepository();
    const items = await repository.getPendingItems(1);

    expect(items).toHaveLength(1);
    expect(items[0]?.entityType).toBe("camisa_measurement");

    expect(mockGetAllAsync).toHaveBeenCalledTimes(3);
    const [clientSql, ...clientParams] = mockGetAllAsync.mock.calls[0] ?? [];
    const [camisaSql, ...camisaParams] = mockGetAllAsync.mock.calls[1] ?? [];
    const [pantalonSql, ...pantalonParams] =
      mockGetAllAsync.mock.calls[2] ?? [];

    expect(clientSql).toContain("FROM clients");
    expect(clientSql).toContain("sync_status IN (?, ?)");
    expect(clientParams).toEqual(["pending", "error", 1]);

    expect(camisaSql).toContain("FROM camisa_measurements");
    expect(camisaSql).toContain("sync_status IN (?, ?)");
    expect(camisaParams).toEqual(["pending", "error", 1]);

    expect(pantalonSql).toContain("FROM pantalon_measurements");
    expect(pantalonSql).toContain("sync_status IN (?, ?)");
    expect(pantalonParams).toEqual(["pending", "error", 1]);
  });

  it("marks client row as synced", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("client", "c-1");

    const [sql, status, updatedAt, id] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE clients");
    expect(status).toBe("synced");
    expect(updatedAt).toBe("2026-04-30T10:00:00.000Z");
    expect(id).toBe("c-1");
  });

  it("marks camisa_measurement row as error", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsError("camisa_measurement", "cam-1");

    const [sql, status, updatedAt, id] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE camisa_measurements");
    expect(status).toBe("error");
    expect(updatedAt).toBe("2026-04-30T10:00:00.000Z");
    expect(id).toBe("cam-1");
  });

  it("marks pantalon_measurement row as synced", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("pantalon_measurement", "pan-1");

    const [sql, status, updatedAt, id] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE pantalon_measurements");
    expect(status).toBe("synced");
    expect(updatedAt).toBe("2026-04-30T10:00:00.000Z");
    expect(id).toBe("pan-1");
  });

  it("throws when fetching pending items fails", async () => {
    mockGetAllAsync.mockRejectedValueOnce(new Error("db unavailable"));

    const repository = new SyncQueueRepository();

    await expect(repository.getPendingItems(10)).rejects.toThrow(
      "db unavailable",
    );
    expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
  });
});
