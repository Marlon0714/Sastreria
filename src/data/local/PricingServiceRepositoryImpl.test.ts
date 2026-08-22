import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { PricingServiceRepositoryImpl } from "./PricingServiceRepositoryImpl";

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();
const mockWithTransactionAsync =
  jest.fn<(callback: () => Promise<void>) => Promise<void>>();
const mockGenerateDomainUuid = jest.fn<() => string>();

const mockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
  getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetFirstAsync(sql, ...params) as Promise<T | null>,
  withTransactionAsync: (callback: () => Promise<void>) =>
    mockWithTransactionAsync(callback),
};

jest.mock("./database", () => ({
  getDatabase: () => mockDatabase,
}));

jest.mock("../../features/clients/domain/types", () => ({
  generateDomainUuid: () => mockGenerateDomainUuid(),
}));

const baseRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Arreglo de pantalón",
  price: 25000,
  notes: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  sync_status: "pending" as const,
};

describe("PricingServiceRepositoryImpl", () => {
  let repo: PricingServiceRepositoryImpl;

  beforeEach(() => {
    repo = new PricingServiceRepositoryImpl();
    jest.clearAllMocks();
    mockGenerateDomainUuid.mockReturnValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    mockWithTransactionAsync.mockImplementation(async (callback) => {
      await callback();
    });
  });

  it("getAll retorna servicios mapeados", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const result = await repo.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Arreglo de pantalón");
    expect(result[0].syncStatus).toBe("pending");
  });

  it("getAll retorna lista vacía si no hay registros", async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);
    const result = await repo.getAll();
    expect(result).toEqual([]);
  });

  it("getById retorna servicio si existe", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(baseRow);
    const result = await repo.getById(baseRow.id);
    expect(result?.id).toBe(baseRow.id);
    expect(result?.price).toBe(25000);
  });

  it("getById retorna null si no existe", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const result = await repo.getById("nope");
    expect(result).toBeNull();
  });

  it("create inserta y retorna servicio con syncStatus pending", async () => {
    mockRunAsync.mockResolvedValueOnce(undefined);
    const input = {
      name: "Basta de dobladillo",
      price: 15000,
      category: "arreglo" as const,
    };
    const result = await repo.create(input);
    expect(result.name).toBe("Basta de dobladillo");
    expect(result.price).toBe(15000);
    expect(result.syncStatus).toBe("pending");
    expect(typeof result.id).toBe("string");
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
  });

  it("update actualiza campos y retorna servicio con syncStatus pending", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(baseRow);
    mockRunAsync.mockResolvedValueOnce(undefined);
    const result = await repo.update(baseRow.id, { price: 30000 });
    expect(result.price).toBe(30000);
    expect(result.syncStatus).toBe("pending");
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
  });

  it("update lanza error si el servicio no existe", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    await expect(repo.update("nope", { price: 1 })).rejects.toThrow(
      "PricingService not found: nope",
    );
  });

  describe("nombre único", () => {
    it("create rechaza un nombre duplicado (case-insensitive, con espacios)", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ id: "otro-id" });

      await expect(
        repo.create({
          name: "  ARREGLO de Pantalón  ",
          price: 15000,
          category: "arreglo",
        }),
      ).rejects.toThrow("Ya existe un servicio con ese nombre.");
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it("create inserta normalmente si no hay ningún otro servicio con ese nombre", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      mockRunAsync.mockResolvedValueOnce(undefined);

      const result = await repo.create({
        name: "Nombre nuevo",
        price: 15000,
        category: "arreglo",
      });

      expect(result.name).toBe("Nombre nuevo");
      expect(mockRunAsync).toHaveBeenCalledTimes(1);
    });

    it("update rechaza si el nuevo nombre coincide con OTRO servicio existente", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // getById(prev)
      mockGetFirstAsync.mockResolvedValueOnce({ id: "otro-id" }); // chequeo de duplicado

      await expect(
        repo.update(baseRow.id, { name: "Nombre de otro servicio" }),
      ).rejects.toThrow("Ya existe un servicio con ese nombre.");
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it("update NO dispara el chequeo si mantiene su PROPIO nombre actual", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // getById(prev)
      // El chequeo excluye el propio id — ninguna otra fila coincide.
      mockGetFirstAsync.mockResolvedValueOnce(null);
      mockRunAsync.mockResolvedValueOnce(undefined);

      const result = await repo.update(baseRow.id, {
        name: baseRow.name,
        price: 30000,
      });

      expect(result.price).toBe(30000);
      const [, , excludedId] = mockGetFirstAsync.mock.calls[1] ?? [];
      expect(excludedId).toBe(baseRow.id);
    });

    it("update no chequea duplicado si el input no trae `name`", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // solo getById
      mockRunAsync.mockResolvedValueOnce(undefined);

      await repo.update(baseRow.id, { price: 30000 });

      expect(mockGetFirstAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("delete elimina el registro y registra entrada en sync_delete_log dentro de transacción", async () => {
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    mockRunAsync.mockResolvedValue(undefined);

    await expect(repo.delete(baseRow.id)).resolves.toBeUndefined();

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(2);

    const [deleteSql, deleteParam] = mockRunAsync.mock.calls[0] ?? [];
    expect(deleteSql).toContain("DELETE FROM pricing_services WHERE id = ?");
    expect(deleteParam).toBe(baseRow.id);

    const [insertSql, ...insertParams] = mockRunAsync.mock.calls[1] ?? [];
    expect(insertSql).toContain("INSERT INTO sync_delete_log");
    expect(insertParams[0]).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(insertParams[1]).toBe("pricing_service");
    expect(insertParams[2]).toBe(baseRow.id);
    expect(insertParams[4]).toBe("pending");
  });

  describe("onWriteCommitted", () => {
    it("se llama una vez después de create()", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repoWithHook = new PricingServiceRepositoryImpl({
        onWriteCommitted,
      });

      await repoWithHook.create({
        name: "Basta de dobladillo",
        price: 15000,
        category: "arreglo",
      });

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("se llama una vez después de update()", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow);
      mockRunAsync.mockResolvedValueOnce(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repoWithHook = new PricingServiceRepositoryImpl({
        onWriteCommitted,
      });

      await repoWithHook.update(baseRow.id, { price: 30000 });

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("se llama una vez después de delete() (N-066)", async () => {
      mockRunAsync.mockResolvedValue(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repoWithHook = new PricingServiceRepositoryImpl({
        onWriteCommitted,
      });

      await repoWithHook.delete(baseRow.id);

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });
  });
});
