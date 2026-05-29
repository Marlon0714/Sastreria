import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { PricingServiceRepositoryImpl } from "./PricingServiceRepositoryImpl";

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();

const mockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
  getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetFirstAsync(sql, ...params) as Promise<T | null>,
};

jest.mock("./database", () => ({
  getDatabase: () => mockDatabase,
}));

jest.mock("../../features/clients/domain/types", () => ({
  generateDomainUuid: () => "550e8400-e29b-41d4-a716-446655440000",
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

  it("delete elimina el registro por id", async () => {
    mockRunAsync.mockResolvedValueOnce(undefined);
    await expect(repo.delete(baseRow.id)).resolves.toBeUndefined();
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM pricing_services"),
      baseRow.id,
    );
  });
});
