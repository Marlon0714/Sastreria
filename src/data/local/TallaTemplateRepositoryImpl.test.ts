import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { TallaTemplateRepositoryImpl } from "./TallaTemplateRepositoryImpl";

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
  name: "Molde estándar",
  type: "camisa" as const,
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
  ancho_manga: 30,
  escote: 18,
  cuello: 38,
  brazo: 56,
  puno: 22,
  tiro: null,
  pierna: null,
  rodilla: null,
  bota: null,
  notes: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
  sync_status: "pending" as const,
};

describe("TallaTemplateRepositoryImpl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("findAll retorna plantillas mapeadas", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repo = new TallaTemplateRepositoryImpl();
    const result = await repo.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Molde estándar");
    expect(result[0].talleDelantero).toBe(43);
  });

  describe("onWriteCommitted", () => {
    it("se llama una vez después de create()", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      mockGetFirstAsync.mockResolvedValueOnce(baseRow);
      const onWriteCommitted = jest.fn<() => void>();
      const repo = new TallaTemplateRepositoryImpl({ onWriteCommitted });

      await repo.create({ name: "Molde estándar", type: "camisa" });

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("se llama una vez después de update()", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      mockGetFirstAsync.mockResolvedValueOnce(baseRow);
      const onWriteCommitted = jest.fn<() => void>();
      const repo = new TallaTemplateRepositoryImpl({ onWriteCommitted });

      await repo.update({ id: baseRow.id, espalda: 44 });

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("NO se llama después de delete() (fuera de alcance por ahora)", async () => {
      mockRunAsync.mockResolvedValueOnce(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repo = new TallaTemplateRepositoryImpl({ onWriteCommitted });

      await repo.delete(baseRow.id);

      expect(onWriteCommitted).not.toHaveBeenCalled();
    });
  });
});
