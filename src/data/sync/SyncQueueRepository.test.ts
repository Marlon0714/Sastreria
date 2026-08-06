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
          pecho_ajustado: 98,
          pecho_ancho: null,
          cintura_ajustado: 80,
          cintura_ancho: null,
          base_ajustado: 100,
          base_ancho: null,
          largo: 70,
          largo_manga: 62,
          ancho_manga: 32,
          escote: 18,
          cuello_normal: 38,
          cuello_cruce: null,
          brazo: 58,
          puno: 24,
          changed_by: "modista-1",
          changed_at: "2026-04-30T08:59:00.000Z",
          notes: null,
          created_at: "2026-04-30T09:00:00.000Z",
          updated_at: "2026-04-30T09:00:00.000Z",
          sync_status: "error",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "del-1",
          entity_type: "client",
          entity_id: "c-2",
          deleted_at: "2026-04-30T09:30:00.000Z",
          sync_status: "pending",
        },
      ]);

    const repository = new SyncQueueRepository();
    const items = await repository.getPendingItems(1);

    expect(items).toHaveLength(1);
    expect(items[0]?.entityType).toBe("camisa_measurement");

    // Verify payload fidelity — all camisa fields including cuello/brazo/puno
    const camisaItem = items[0] as unknown as {
      payload: Record<string, unknown>;
    };
    expect(camisaItem.payload.cuelloNormal).toBe(38);
    expect(camisaItem.payload.brazo).toBe(58);
    expect(camisaItem.payload.puno).toBe(24);
    expect(camisaItem.payload.changedBy).toBe("modista-1");
    expect(camisaItem.payload.changedAt).toBe("2026-04-30T08:59:00.000Z");

    expect(mockGetAllAsync).toHaveBeenCalledTimes(11);
    const [clientSql, ...clientParams] = mockGetAllAsync.mock.calls[0] ?? [];
    const [camisaSql, ...camisaParams] = mockGetAllAsync.mock.calls[1] ?? [];
    const [pantalonSql, ...pantalonParams] =
      mockGetAllAsync.mock.calls[2] ?? [];
    const [tallaSql, ...tallaParams] = mockGetAllAsync.mock.calls[3] ?? [];
    const [pricingSql, ...pricingParams] = mockGetAllAsync.mock.calls[4] ?? [];
    const [sacoSql, ...sacoParams] = mockGetAllAsync.mock.calls[5] ?? [];
    const [chalecoSql, ...chalecoParams] = mockGetAllAsync.mock.calls[6] ?? [];
    const [tallaTemplateSql, ...tallaTemplateParams] =
      mockGetAllAsync.mock.calls[7] ?? [];
    const [scheduleSql, ...scheduleParams] =
      mockGetAllAsync.mock.calls[8] ?? [];
    const [scheduleEventSql, ...scheduleEventParams] =
      mockGetAllAsync.mock.calls[9] ?? [];
    const [deleteSql, ...deleteParams] = mockGetAllAsync.mock.calls[10] ?? [];

    expect(clientSql).toContain("FROM clients");
    expect(clientSql).toContain("sync_status IN (?, ?)");
    expect(clientParams).toEqual(["pending", "error", 1]);

    expect(camisaSql).toContain("FROM camisa_measurements");
    expect(camisaSql).toContain("sync_status IN (?, ?)");
    expect(camisaSql).toContain("cuello_normal");
    expect(camisaSql).toContain("brazo");
    expect(camisaSql).toContain("puno");
    expect(camisaSql).toContain("changed_by");
    expect(camisaSql).toContain("changed_at");
    expect(camisaParams).toEqual(["pending", "error", 1]);

    expect(pantalonSql).toContain("FROM pantalon_measurements");
    expect(pantalonSql).toContain("sync_status IN (?, ?)");
    expect(pantalonParams).toEqual(["pending", "error", 1]);

    expect(tallaSql).toContain("FROM client_tallas");
    expect(tallaSql).toContain("sync_status IN (?, ?)");
    expect(tallaParams).toEqual(["pending", "error", 1]);

    expect(pricingSql).toContain("FROM pricing_services");
    expect(pricingSql).toContain("sync_status IN (?, ?)");
    expect(pricingSql).toContain("updatedAt");
    expect(pricingParams).toEqual(["pending", "error", 1]);

    expect(sacoSql).toContain("FROM saco_measurements");
    expect(sacoSql).toContain("sync_status IN (?, ?)");
    expect(sacoParams).toEqual(["pending", "error", 1]);

    expect(chalecoSql).toContain("FROM chaleco_measurements");
    expect(chalecoSql).toContain("sync_status IN (?, ?)");
    expect(chalecoParams).toEqual(["pending", "error", 1]);

    expect(tallaTemplateSql).toContain("FROM talla_templates");
    expect(tallaTemplateSql).toContain("sync_status IN (?, ?)");
    expect(tallaTemplateParams).toEqual(["pending", "error", 1]);

    expect(scheduleSql).toContain("FROM schedules");
    expect(scheduleSql).toContain("sync_status IN (?, ?)");
    expect(scheduleParams).toEqual(["pending", "error", 1]);

    expect(scheduleEventSql).toContain("FROM schedule_events");
    expect(scheduleEventSql).toContain("sync_status IN (?, ?)");
    expect(scheduleEventParams).toEqual(["pending", "error", 1]);

    expect(deleteSql).toContain("FROM sync_delete_log");
    expect(deleteSql).toContain("sync_status IN (?, ?)");
    expect(deleteParams).toEqual(["pending", "error", 1]);
  });

  it("mapea phones (JSON) y cedula del cliente en el payload de la cola", async () => {
    mockGetAllAsync
      .mockResolvedValueOnce([
        {
          id: "c-3",
          first_name: "Juan",
          last_name: "Pérez",
          phone: "3009998877",
          phones: JSON.stringify(["3101234567", "6011234567"]),
          cedula: "1020304050",
          notes: null,
          created_at: "2026-04-30T08:00:00.000Z",
          updated_at: "2026-04-30T10:00:00.000Z",
          sync_status: "pending",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const repository = new SyncQueueRepository();
    const items = await repository.getPendingItems(10);

    expect(items).toHaveLength(1);
    const clientItem = items[0] as unknown as {
      payload: Record<string, unknown>;
    };
    expect(clientItem.payload.phones).toEqual([
      "3101234567",
      "6011234567",
    ]);
    expect(clientItem.payload.cedula).toBe("1020304050");
  });

  it("mapea category en el payload de la cola de schedules", async () => {
    mockGetAllAsync
      .mockResolvedValueOnce([]) // clients
      .mockResolvedValueOnce([]) // camisa
      .mockResolvedValueOnce([]) // pantalon
      .mockResolvedValueOnce([]) // client_talla
      .mockResolvedValueOnce([]) // pricing
      .mockResolvedValueOnce([]) // saco
      .mockResolvedValueOnce([]) // chaleco
      .mockResolvedValueOnce([]) // talla_template
      .mockResolvedValueOnce([
        {
          id: "schedule-1",
          date: "2026-08-10",
          time: "14:30",
          price: null,
          operario_id: null,
          client_id: "c-1",
          notes: null,
          is_priority: 0,
          category: "confeccion",
          status: "pendiente",
          status_locked: 0,
          ready_at: null,
          delivered_at: null,
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:00:00.000Z",
          sync_status: "pending",
        },
      ]) // schedules
      .mockResolvedValueOnce([]) // schedule_events
      .mockResolvedValueOnce([]); // delete_log

    const repository = new SyncQueueRepository();
    const items = await repository.getPendingItems(10);

    expect(items).toHaveLength(1);
    const scheduleItem = items[0] as unknown as {
      payload: Record<string, unknown>;
    };
    expect(scheduleItem.payload.category).toBe("confeccion");
  });

  it("marks client row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("client", "c-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE clients");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("c-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks camisa_measurement row as error using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsError("camisa_measurement", "cam-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE camisa_measurements");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("error");
    expect(id).toBe("cam-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks pantalon_measurement row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("pantalon_measurement", "pan-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE pantalon_measurements");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("pan-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks client_talla row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("client_talla", "talla-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE client_tallas");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("talla-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks pricing_service row as error using updatedAt (camelCase) as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsError("pricing_service", "price-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE pricing_services");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updatedAt = ?");
    expect(status).toBe("error");
    expect(id).toBe("price-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks saco_measurement row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("saco_measurement", "saco-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE saco_measurements");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("saco-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks chaleco_measurement row as error using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsError("chaleco_measurement", "chaleco-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE chaleco_measurements");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("error");
    expect(id).toBe("chaleco-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks talla_template row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("talla_template", "template-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE talla_templates");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("template-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks schedule row as synced using updated_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("schedule", "schedule-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE schedules");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND updated_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("schedule-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks schedule_event row as synced using created_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("schedule_event", "event-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE schedule_events");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND created_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("event-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks delete_log row as synced using deleted_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsSynced("delete_log", "del-1", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE sync_delete_log");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND deleted_at = ?");
    expect(status).toBe("synced");
    expect(id).toBe("del-1");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("marks delete_log row as error using deleted_at as an optimistic-concurrency guard", async () => {
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncQueueRepository();
    await repository.markAsError("delete_log", "del-2", "2026-08-01T10:00:00.000Z");

    const [sql, status, id, updatedAt] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("UPDATE sync_delete_log");
    expect(sql).toMatch(/SET\s+sync_status\s*=\s*\?\s*\n\s*WHERE/);
    expect(sql).toContain("WHERE id = ? AND deleted_at = ?");
    expect(status).toBe("error");
    expect(id).toBe("del-2");
    expect(updatedAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("throws when fetching pending items fails", async () => {
    // Las 11 queries de getPendingItems corren en paralelo (Promise.all), así
    // que todas se disparan aunque la primera falle — solo el await conjunto
    // rechaza de inmediato con el primer error.
    mockGetAllAsync.mockRejectedValueOnce(new Error("db unavailable"));
    mockGetAllAsync.mockResolvedValue([]);

    const repository = new SyncQueueRepository();

    await expect(repository.getPendingItems(10)).rejects.toThrow(
      "db unavailable",
    );
    expect(mockGetAllAsync).toHaveBeenCalledTimes(11);
  });
});
