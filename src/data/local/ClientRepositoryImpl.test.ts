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
    mockWithTransactionAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    mockWithTransactionAsync.mockImplementation(async (callback) => {
      await callback();
    });

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

  it("updates client with pending sync status and mapped response", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      first_name: "Ana",
      last_name: "Torres",
      phone: "3001234567",
      notes: "VIP",
      created_at: "2026-01-01T10:00:00.000Z",
      updated_at: "2026-04-29T12:30:00.000Z",
      sync_status: "pending",
    });

    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ClientRepositoryImpl({ onWriteCommitted });

    const result = await repository.update({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "  Ana ",
      lastName: " Torres  ",
      phone: " 3001234567 ",
      notes: " VIP ",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [updateSql, ...updateParams] = mockRunAsync.mock.calls[0] ?? [];
    expect(updateSql).toContain("UPDATE clients");
    expect(updateSql).toContain("sync_status = 'pending'");
    expect(updateParams).toEqual([
      "Ana",
      "Torres",
      "3001234567",
      "VIP",
      "2026-04-29T12:30:00.000Z",
      "11111111-1111-4111-8111-111111111111",
    ]);

    expect(result).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "VIP",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-04-29T12:30:00.000Z",
      syncStatus: "pending",
      measurements: [],
    });
    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });

  it("returns constructed client when update id does not exist", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ClientRepositoryImpl({ onWriteCommitted });

    const result = await repository.update({
      id: "99999999-9999-4999-8999-999999999999",
      firstName: "  Laura ",
      lastName: " Mora ",
      phone: " 3110001111 ",
      notes: "  ",
    });

    expect(result).toEqual({
      id: "99999999-9999-4999-8999-999999999999",
      firstName: "Laura",
      lastName: "Mora",
      phone: "3110001111",
      notes: "",
      createdAt: "2026-04-29T12:30:00.000Z",
      updatedAt: "2026-04-29T12:30:00.000Z",
      syncStatus: "pending",
      measurements: [],
    });
    expect(onWriteCommitted).not.toHaveBeenCalled();
  });

  it("deletes client and logs pending delete within one transaction", async () => {
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    mockRunAsync.mockResolvedValue({});

    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ClientRepositoryImpl({ onWriteCommitted });

    await repository.delete("11111111-1111-4111-8111-111111111111");

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(4);

    const [deleteCamisaSql, deleteCamisaId] = mockRunAsync.mock.calls[0] ?? [];
    const [deletePantalonSql, deletePantalonId] =
      mockRunAsync.mock.calls[1] ?? [];
    const [deleteClientSql, deleteClientId] = mockRunAsync.mock.calls[2] ?? [];
    const [insertLogSql, ...insertLogParams] = mockRunAsync.mock.calls[3] ?? [];

    expect(deleteCamisaSql).toContain("DELETE FROM camisa_measurements");
    expect(deleteCamisaId).toBe("11111111-1111-4111-8111-111111111111");
    expect(deletePantalonSql).toContain("DELETE FROM pantalon_measurements");
    expect(deletePantalonId).toBe("11111111-1111-4111-8111-111111111111");
    expect(deleteClientSql).toContain("DELETE FROM clients");
    expect(deleteClientId).toBe("11111111-1111-4111-8111-111111111111");

    expect(insertLogSql).toContain("INSERT INTO sync_delete_log");
    expect(insertLogParams).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "client",
      "11111111-1111-4111-8111-111111111111",
      "2026-04-29T12:30:00.000Z",
      "pending",
    ]);

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });
});
