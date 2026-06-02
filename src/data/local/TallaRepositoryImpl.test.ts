import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { TallaRepositoryImpl } from "./TallaRepositoryImpl";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  withTransactionAsync: (callback: () => Promise<void>) => Promise<void>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockWithTransactionAsync =
  jest.fn<(callback: () => Promise<void>) => Promise<void>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
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

describe("TallaRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockWithTransactionAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    mockWithTransactionAsync.mockImplementation(async (callback) => {
      await callback();
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-14T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("upsert con CreateTallaDTO crea talla nueva con syncStatus pending y query parametrizada", async () => {
    // Arrange
    const expectedId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    mockRunAsync.mockResolvedValueOnce({});
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: expectedId,
        client_id: "11111111-1111-4111-8111-111111111111",
        type: "camisa",
        value: "M",
        notes: "talla normal",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
        sync_status: "pending",
      },
    ]);
    mockGenerateDomainUuid.mockReturnValueOnce(expectedId);
    const repository = new TallaRepositoryImpl();

    // Act
    const result = await repository.upsert({
      clientId: "11111111-1111-4111-8111-111111111111",
      type: "camisa",
      value: "  M  ",
      notes: "  talla normal  ",
    });

    // Assert
    expect(result).toEqual({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientId: "11111111-1111-4111-8111-111111111111",
      type: "camisa",
      value: "M",
      notes: "talla normal",
      createdAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      syncStatus: "pending",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("INSERT OR REPLACE INTO client_tallas");
    expect(sql).not.toContain("talla normal");
    expect(params[0]).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(params[1]).toBe("11111111-1111-4111-8111-111111111111");
    expect(params[2]).toBe("camisa");
    expect(params[3]).toBe("M");
    expect(params[4]).toBe("talla normal");
  });

  it("upsert con UpdateTallaDTO usa el id existente y no genera uuid nuevo", async () => {
    // Arrange
    mockRunAsync.mockResolvedValueOnce({});
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        client_id: "11111111-1111-4111-8111-111111111111",
        type: "pantalon",
        value: "32",
        notes: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
        sync_status: "pending",
      },
    ]);
    const repository = new TallaRepositoryImpl();

    // Act
    const result = await repository.upsert({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      clientId: "11111111-1111-4111-8111-111111111111",
      type: "pantalon",
      value: "  32  ",
    });

    // Assert — createdAt preservado del registro existente
    expect(result).toEqual({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      clientId: "11111111-1111-4111-8111-111111111111",
      type: "pantalon",
      value: "32",
      notes: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      syncStatus: "pending",
    });

    expect(mockGenerateDomainUuid).not.toHaveBeenCalled();
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [, firstParam] = mockRunAsync.mock.calls[0] ?? [];
    expect(firstParam).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("findByClientId retorna array vacío si no hay tallas para el cliente", async () => {
    // Arrange
    mockGetAllAsync.mockResolvedValueOnce([]);
    const repository = new TallaRepositoryImpl();

    // Act
    const result = await repository.findByClientId(
      "11111111-1111-4111-8111-111111111111",
    );

    // Assert
    expect(result).toEqual([]);
    const [sql, clientId] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE client_id = ?");
    expect(clientId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("findByClientId retorna tallas mapeadas de snake_case a camelCase ordenadas por type", async () => {
    // Arrange
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        client_id: "11111111-1111-4111-8111-111111111111",
        type: "camisa",
        value: "M",
        notes: null,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
        sync_status: "synced",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        client_id: "11111111-1111-4111-8111-111111111111",
        type: "pantalon",
        value: "32",
        notes: "ajustado",
        created_at: "2026-05-02T00:00:00.000Z",
        updated_at: "2026-05-02T00:00:00.000Z",
        sync_status: "pending",
      },
    ]);
    const repository = new TallaRepositoryImpl();

    // Act
    const result = await repository.findByClientId(
      "11111111-1111-4111-8111-111111111111",
    );

    // Assert
    expect(result).toEqual([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientId: "11111111-1111-4111-8111-111111111111",
        type: "camisa",
        value: "M",
        notes: null,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        syncStatus: "synced",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        clientId: "11111111-1111-4111-8111-111111111111",
        type: "pantalon",
        value: "32",
        notes: "ajustado",
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
        syncStatus: "pending",
      },
    ]);

    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("ORDER BY type ASC");
  });

  it("delete elimina la talla y registra entrada en sync_delete_log dentro de transacción", async () => {
    // Arrange
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    mockRunAsync.mockResolvedValue({});
    const repository = new TallaRepositoryImpl();

    // Act
    await repository.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    // Assert
    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(2);

    const [deleteSql, deleteParam] = mockRunAsync.mock.calls[0] ?? [];
    expect(deleteSql).toContain("DELETE FROM client_tallas WHERE id = ?");
    expect(deleteParam).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    const [insertSql, ...insertParams] = mockRunAsync.mock.calls[1] ?? [];
    expect(insertSql).toContain("INSERT INTO sync_delete_log");
    expect(insertParams[0]).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(insertParams[1]).toBe("client_talla");
    expect(insertParams[2]).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(insertParams[4]).toBe("pending");
  });

  it("llama onWriteCommitted después de upsert exitoso", async () => {
    // Arrange
    const newId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    mockRunAsync.mockResolvedValueOnce({});
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: newId,
        client_id: "11111111-1111-4111-8111-111111111111",
        type: "saco",
        value: "42",
        notes: null,
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
        sync_status: "pending",
      },
    ]);
    mockGenerateDomainUuid.mockReturnValueOnce(newId);
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new TallaRepositoryImpl({ onWriteCommitted });

    // Act
    await repository.upsert({
      clientId: "11111111-1111-4111-8111-111111111111",
      type: "saco",
      value: "42",
    });

    // Assert
    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });

  it("llama onWriteCommitted después de delete exitoso", async () => {
    // Arrange
    mockGenerateDomainUuid.mockReturnValueOnce(
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    );
    mockRunAsync.mockResolvedValue({});
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new TallaRepositoryImpl({ onWriteCommitted });

    // Act
    await repository.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    // Assert
    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });
});
