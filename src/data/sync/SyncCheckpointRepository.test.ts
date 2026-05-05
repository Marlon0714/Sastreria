import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { SyncCheckpointRepository } from "./SyncCheckpointRepository";

interface MockDatabase {
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
}

const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();
const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();

const mockDatabase: MockDatabase = {
  getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetFirstAsync(sql, ...params) as Promise<T | null>,
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
};

jest.mock("../local/database", () => ({
  getDatabase: () => mockDatabase,
}));

describe("SyncCheckpointRepository", () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockRunAsync.mockReset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null when checkpoint does not exist", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const repository = new SyncCheckpointRepository();
    const cursor = await repository.getCursor("clients");

    expect(cursor).toBeNull();
  });

  it("advances checkpoint when there is no current cursor", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncCheckpointRepository();
    await repository.advanceCursor("clients", {
      updatedAt: "2026-05-05T11:00:00.000Z",
      id: "c-1",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [sql, scope, updatedAt, id, rowUpdatedAt] =
      mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("INSERT INTO sync_checkpoints");
    expect(scope).toBe("clients");
    expect(updatedAt).toBe("2026-05-05T11:00:00.000Z");
    expect(id).toBe("c-1");
    expect(rowUpdatedAt).toBe("2026-05-05T12:00:00.000Z");
  });

  it("does not move checkpoint backwards", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      cursor_updated_at: "2026-05-05T11:00:00.000Z",
      cursor_id: "c-10",
    });

    const repository = new SyncCheckpointRepository();
    await repository.advanceCursor("clients", {
      updatedAt: "2026-05-05T10:59:59.000Z",
      id: "c-11",
    });

    expect(mockRunAsync).not.toHaveBeenCalled();
  });

  it("compares id to preserve monotonicity when timestamp ties", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      cursor_updated_at: "2026-05-05T11:00:00.000Z",
      cursor_id: "c-10",
    });
    mockRunAsync.mockResolvedValueOnce({});

    const repository = new SyncCheckpointRepository();
    await repository.advanceCursor("clients", {
      updatedAt: "2026-05-05T11:00:00.000Z",
      id: "c-11",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
  });

  it("does not move checkpoint backwards when timestamp ties but id is older", async () => {
    // Arrange
    mockGetFirstAsync.mockResolvedValueOnce({
      cursor_updated_at: "2026-05-05T11:00:00.000Z",
      cursor_id: "c-10",
    });

    const repository = new SyncCheckpointRepository();

    // Act
    await repository.advanceCursor("clients", {
      updatedAt: "2026-05-05T11:00:00.000Z",
      id: "c-09",
    });

    // Assert
    expect(mockRunAsync).not.toHaveBeenCalled();
  });
});
