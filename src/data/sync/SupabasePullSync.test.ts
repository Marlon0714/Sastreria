import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabasePullSync } from "./SupabasePullSync";

interface MockQueryResult {
  data: unknown[];
  error: null | { code: string };
}

interface MockQueryBuilder {
  select: (columns: string) => MockQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => MockQueryBuilder;
  limit: (value: number) => MockQueryBuilder;
  or: (value: string) => MockQueryBuilder;
  then: (
    onfulfilled?: ((value: MockQueryResult) => unknown) | null,
  ) => Promise<unknown>;
}

const mockQueryResults: Record<string, MockQueryResult[]> = {
  clients: [],
  camisa_measurements: [],
  pantalon_measurements: [],
  sync_delete_log: [],
};

const mockOrCalls: Record<string, string[]> = {
  clients: [],
  camisa_measurements: [],
  pantalon_measurements: [],
  sync_delete_log: [],
};

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockWithTransactionAsync = jest.fn(async (task: () => Promise<void>) =>
  task(),
);

function mockBuildQueryBuilder(
  table: string,
  result: MockQueryResult,
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    or: (value: string) => {
      mockOrCalls[table]?.push(value);
      return builder;
    },
    then: (onfulfilled) =>
      Promise.resolve(onfulfilled ? onfulfilled(result) : result),
  };

  return builder;
}

jest.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({
    from: (table: string): MockQueryBuilder => {
      const result = mockQueryResults[table]?.shift() ?? {
        data: [],
        error: null,
      };
      return mockBuildQueryBuilder(table, result);
    },
  }),
}));

jest.mock("../local/database", () => ({
  getDatabase: () => ({
    runAsync: (sql: string, ...params: unknown[]) =>
      mockRunAsync(sql, ...params),
    withTransactionAsync: (task: () => Promise<void>) =>
      mockWithTransactionAsync(task),
  }),
}));

describe("SupabasePullSync", () => {
  beforeEach(() => {
    mockQueryResults.clients = [];
    mockQueryResults.camisa_measurements = [];
    mockQueryResults.pantalon_measurements = [];
    mockQueryResults.sync_delete_log = [];
    mockOrCalls.clients = [];
    mockOrCalls.camisa_measurements = [];
    mockOrCalls.pantalon_measurements = [];
    mockOrCalls.sync_delete_log = [];
    mockRunAsync.mockReset();
    mockWithTransactionAsync.mockClear();
  });

  it("applies monotonic cursor filter for clients when checkpoint exists", async () => {
    // Arrange
    mockQueryResults.clients.push({
      data: [
        {
          id: "c-2",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return {
            updatedAt: "2026-05-01T09:59:00.000Z",
            id: "00000000-0000-0000-0000-000000000001",
          };
        }

        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    expect(mockOrCalls.clients).toContain(
      "updated_at.gt.2026-05-01T09:59:00.000Z,and(updated_at.eq.2026-05-01T09:59:00.000Z,id.gt.00000000-0000-0000-0000-000000000001)",
    );
  });

  it("applies incremental client upserts and advances client checkpoint", async () => {
    mockQueryResults.clients.push({
      data: [
        {
          id: "c-1",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    expect(mockRunAsync).toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith("clients", {
      id: "c-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
    });
  });

  it("applies camisa incremental upserts including audit trail and advances checkpoint", async () => {
    mockQueryResults.camisa_measurements.push({
      data: [
        {
          id: "cam-1",
          client_id: "c-1",
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
          cuello: 38,
          brazo: 58,
          puno: 24,
          changed_by: "modista-1",
          changed_at: "2026-05-01T10:05:00.000Z",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:10:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const camisaCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO camisa_measurements"),
    );
    expect(camisaCalls).toHaveLength(1);
    const [sql, ...params] = camisaCalls[0] ?? [];
    expect(sql).toContain("changed_by");
    expect(sql).toContain("changed_at");
    expect(params).toContain("modista-1");
    expect(params).toContain("2026-05-01T10:05:00.000Z");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "camisa_measurements",
      {
        id: "cam-1",
        updatedAt: "2026-05-01T10:10:00.000Z",
      },
    );
  });

  it("applies pantalon incremental upserts including audit trail and advances checkpoint", async () => {
    mockQueryResults.pantalon_measurements.push({
      data: [
        {
          id: "pan-1",
          client_id: "c-1",
          largo: 102,
          cintura: 88,
          base: 110,
          tiro: 28,
          pierna: 54,
          rodilla: 44,
          bota: 38,
          changed_by: "modista-2",
          changed_at: "2026-05-01T10:08:00.000Z",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:12:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const pantalonCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO pantalon_measurements"),
    );
    expect(pantalonCalls).toHaveLength(1);
    const [sql, ...params] = pantalonCalls[0] ?? [];
    expect(sql).toContain("changed_by");
    expect(sql).toContain("changed_at");
    expect(params).toContain("modista-2");
    expect(params).toContain("2026-05-01T10:08:00.000Z");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "pantalon_measurements",
      {
        id: "pan-1",
        updatedAt: "2026-05-01T10:12:00.000Z",
      },
    );
  });

  it("applies delete log idempotently and advances delete checkpoint", async () => {
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-1",
          entity_type: "client",
          entity_id: "c-1",
          deleted_at: "2026-05-01T11:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sqlStatements = mockRunAsync.mock.calls.map((call) => call[0]);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      {
        id: "del-1",
        updatedAt: "2026-05-01T11:00:00.000Z",
      },
    );
  });

  it("keeps delete application idempotent when the same delete batch is replayed", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push(
      {
        data: [
          {
            id: "del-1",
            entity_type: "client",
            entity_id: "c-1",
            deleted_at: "2026-05-01T11:00:00.000Z",
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: "del-1",
            entity_type: "client",
            entity_id: "c-1",
            deleted_at: "2026-05-01T11:00:00.000Z",
          },
        ],
        error: null,
      },
    );

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();
    await pullSync.pullIncremental();

    // Assert
    const deleteClientStatements = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("DELETE FROM clients"),
    );
    const markDeleteSyncedStatements = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("UPDATE sync_delete_log"),
    );

    expect(deleteClientStatements).toHaveLength(2);
    expect(markDeleteSyncedStatements).toHaveLength(2);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledTimes(2);
  });

  it("throws when clients incremental fetch fails", async () => {
    // Arrange
    mockQueryResults.clients.push({
      data: [],
      error: { code: "42501" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] clients incremental fetch failed: 42501",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when camisa measurements incremental fetch fails", async () => {
    // Arrange — clients returns empty (no error), camisa returns error
    mockQueryResults.camisa_measurements.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] camisa incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when pantalon measurements incremental fetch fails", async () => {
    // Arrange — clients + camisa return empty, pantalon returns error
    mockQueryResults.pantalon_measurements.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] pantalon incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when delete log incremental fetch fails", async () => {
    // Arrange — clients + camisa + pantalon return empty, delete log returns error
    mockQueryResults.sync_delete_log.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] delete log incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when cursor has a non-ISO timestamp (cursor injection guard)", async () => {
    // Arrange — cursor with invalid timestamp format
    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return {
            updatedAt: "'; DROP TABLE clients; --",
            id: "00000000-0000-0000-0000-000000000001",
          };
        }
        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[sync] invalid cursor values, aborting pull",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when cursor has an invalid UUID (cursor injection guard)", async () => {
    // Arrange — cursor with valid timestamp but invalid UUID
    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return { updatedAt: "2026-05-01T10:00:00.000Z", id: "not-a-uuid" };
        }
        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[sync] invalid cursor values, aborting pull",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("applies camisa_measurement delete by id when entity_type is camisa_measurement", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-2",
          entity_type: "camisa_measurement",
          entity_id: "cam-99",
          deleted_at: "2026-05-01T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) =>
        sql.includes("DELETE FROM camisa_measurements"),
      ),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    // Must NOT delete from clients table
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(false);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-2", updatedAt: "2026-05-01T12:00:00.000Z" },
    );
  });

  it("applies pantalon_measurement delete by id when entity_type is pantalon_measurement", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-3",
          entity_type: "pantalon_measurement",
          entity_id: "pan-99",
          deleted_at: "2026-05-01T13:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) =>
        sql.includes("DELETE FROM pantalon_measurements"),
      ),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(false);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-3", updatedAt: "2026-05-01T13:00:00.000Z" },
    );
  });
});
