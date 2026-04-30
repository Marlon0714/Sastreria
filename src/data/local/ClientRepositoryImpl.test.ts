import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { ClientRepositoryImpl } from "./ClientRepositoryImpl";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
  getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetFirstAsync(sql, ...params) as Promise<T | null>,
};

const mockGenerateDomainUuid = jest.fn<() => string>();

jest.mock("./database", () => {
  return {
    getDatabase: () => mockDatabase,
  };
});

jest.mock("../../features/clients/domain/types", () => {
  const actual = jest.requireActual(
    "../../features/clients/domain/types",
  ) as typeof import("../../features/clients/domain/types");

  return {
    ...actual,
    generateDomainUuid: () => mockGenerateDomainUuid(),
  };
});

describe("ClientRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockGetFirstAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T12:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates client with pending sync status and parameterized query", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    const repository = new ClientRepositoryImpl();

    const created = await repository.create({
      firstName: "  Ana  ",
      lastName: "  Torres  ",
      phone: " 3001234567 ",
      notes: "  Cliente frecuente  ",
    });

    expect(created).toEqual({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "Cliente frecuente",
      createdAt: "2026-04-29T12:30:00.000Z",
      updatedAt: "2026-04-29T12:30:00.000Z",
      syncStatus: "pending",
      measurements: [],
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];

    expect(sql).toContain("VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    expect(sql).not.toContain("Ana");
    expect(params).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "Ana",
      "Torres",
      "3001234567",
      "Cliente frecuente",
      "2026-04-29T12:30:00.000Z",
      "2026-04-29T12:30:00.000Z",
      "pending",
    ]);
  });

  it("triggers onWriteCommitted after successful create", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    );
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ClientRepositoryImpl({ onWriteCommitted });

    await repository.create({
      firstName: "Ana",
      lastName: "Suarez",
      phone: "3001230000",
      notes: "",
    });

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });

  it("does not fail create when onWriteCommitted rejects", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    );
    const onWriteCommitted = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("sync failure"));
    const repository = new ClientRepositoryImpl({ onWriteCommitted });

    await expect(
      repository.create({
        firstName: "Ana",
        lastName: "Perez",
        phone: "3000000000",
      }),
    ).resolves.toBeDefined();
  });

  it("findAll maps snake_case columns to camelCase", async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: "11111111-1111-4111-8111-111111111111",
        first_name: "Ana",
        last_name: "Torres",
        phone: "3001234567",
        notes: "Cliente frecuente",
        created_at: "2026-01-01T10:00:00.000Z",
        updated_at: "2026-01-05T10:00:00.000Z",
        sync_status: "pending",
      },
    ]);

    const repository = new ClientRepositoryImpl();
    const result = await repository.findAll();

    expect(result).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        firstName: "Ana",
        lastName: "Torres",
        phone: "3001234567",
        notes: "Cliente frecuente",
        createdAt: "2026-01-01T10:00:00.000Z",
        updatedAt: "2026-01-05T10:00:00.000Z",
        syncStatus: "pending",
        measurements: [],
      },
    ]);

    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("ORDER BY updated_at DESC");
  });

  it("findById uses parameterized query and returns mapped client", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "22222222-2222-4222-8222-222222222222",
      first_name: "Laura",
      last_name: "Mora",
      phone: "3009991111",
      notes: null,
      created_at: "2026-02-01T10:00:00.000Z",
      updated_at: "2026-02-03T10:00:00.000Z",
      sync_status: "synced",
    });

    const repository = new ClientRepositoryImpl();
    const result = await repository.findById(
      "22222222-2222-4222-8222-222222222222",
    );

    expect(result).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      firstName: "Laura",
      lastName: "Mora",
      phone: "3009991111",
      notes: null,
      createdAt: "2026-02-01T10:00:00.000Z",
      updatedAt: "2026-02-03T10:00:00.000Z",
      syncStatus: "synced",
      measurements: [],
    });

    const [sql, clientId] = mockGetFirstAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE id = ?");
    expect(clientId).toBe("22222222-2222-4222-8222-222222222222");
  });
});
