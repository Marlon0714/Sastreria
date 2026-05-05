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
});
