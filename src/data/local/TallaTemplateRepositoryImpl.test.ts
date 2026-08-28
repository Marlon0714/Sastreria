import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { TallaTemplateRepositoryImpl } from "./TallaTemplateRepositoryImpl";

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();
const mockWithTransactionAsync =
  jest.fn<(callback: () => Promise<void>) => Promise<void>>();

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
    mockWithTransactionAsync.mockImplementation(async (callback) => {
      await callback();
    });
  });

  it("findAll retorna plantillas mapeadas", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repo = new TallaTemplateRepositoryImpl();
    const result = await repo.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Molde estándar");
    expect(result[0].talleDelantero).toBe(43);
  });

  it("delete elimina la plantilla y registra entrada en sync_delete_log dentro de una transacción", async () => {
    mockRunAsync.mockResolvedValue(undefined);
    const repo = new TallaTemplateRepositoryImpl();

    await repo.delete(baseRow.id);

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(2);

    const [deleteSql, deleteParam] = mockRunAsync.mock.calls[0] ?? [];
    expect(deleteSql).toContain("DELETE FROM talla_templates WHERE id = ?");
    expect(deleteParam).toBe(baseRow.id);

    const [insertSql, ...insertParams] = mockRunAsync.mock.calls[1] ?? [];
    expect(insertSql).toContain("INSERT INTO sync_delete_log");
    expect(insertParams[0]).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(insertParams[1]).toBe("talla_template");
    expect(insertParams[2]).toBe(baseRow.id);
    expect(insertParams[4]).toBe("pending");
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
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // fetch previo (merge parcial)
      mockRunAsync.mockResolvedValueOnce(undefined);
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // fetch posterior al UPDATE
      const onWriteCommitted = jest.fn<() => void>();
      const repo = new TallaTemplateRepositoryImpl({ onWriteCommitted });

      await repo.update({ id: baseRow.id, espalda: 44 });

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });
  });

  describe("update", () => {
    it("conserva las medidas existentes en un update parcial, en vez de borrarlas a NULL", async () => {
      // Regresión: antes, cualquier campo omitido del DTO se sobreescribía
      // con NULL (salvo `name`, que sí usaba COALESCE) — un update parcial
      // legítimo (ej. solo renombrar la plantilla) borraba las 27 medidas.
      const existingRow = {
        ...baseRow,
        pecho_ajustado: 50,
        pecho_ancho: 52,
        cintura_ajustado: 80,
        cintura_ancho: 82,
        base_ajustado: 100,
        base_ancho: 102,
        manga_larga: 62,
        manga_corta: 58,
        cuello_normal: 38,
        cuello_cruce: 40,
        entrepierna: 28,
      };
      mockGetFirstAsync.mockResolvedValueOnce(existingRow);
      mockRunAsync.mockResolvedValueOnce(undefined);
      mockGetFirstAsync.mockResolvedValueOnce({
        ...existingRow,
        espalda: 44,
      });

      const repo = new TallaTemplateRepositoryImpl();
      await repo.update({ id: existingRow.id, espalda: 44 });

      const [, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(params[1]).toBe(44); // espalda: sí se actualizó
      expect(params[7]).toBe(existingRow.pecho_ajustado); // conservado, no NULL
      expect(params[8]).toBe(existingRow.pecho_ancho);
      expect(params[16]).toBe(existingRow.manga_larga);
      expect(params[19]).toBe(existingRow.cuello_normal);
      expect(params[23]).toBe(existingRow.entrepierna);
      expect(params[28]).toBe(existingRow.notes);
    });
  });

  describe("onWriteCommitted", () => {
    it("se llama una vez después de delete()", async () => {
      mockRunAsync.mockResolvedValue(undefined);
      const onWriteCommitted = jest.fn<() => void>();
      const repo = new TallaTemplateRepositoryImpl({ onWriteCommitted });

      await repo.delete(baseRow.id);

      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });
  });

  describe("concurrencia", () => {
    it("dos updates casi simultáneos sobre la misma plantilla no pierden ningún cambio (SELECT+UPDATE atómico)", async () => {
      // Reemplaza el mock "ingenuo" de withTransactionAsync (`await
      // callback()` inmediato) por uno que reproduce la misma serialización
      // de serializeTransactions en database.ts: solo una transacción corre
      // a la vez, y la siguiente espera a que la anterior termine POR
      // COMPLETO (incluida su escritura) antes de arrancar su propio SELECT.
      // Este test es el último del archivo a propósito: mockGetFirstAsync/
      // mockRunAsync quedan con una implementación persistente (no "Once")
      // que no se limpia con jest.clearAllMocks() en el beforeEach.
      let queue: Promise<void> = Promise.resolve();
      mockWithTransactionAsync.mockImplementation((callback) => {
        const run = (): Promise<void> => callback();
        const result = queue.then(run, run);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      });

      let row: Omit<typeof baseRow, "espalda" | "hombro"> & {
        espalda: number | null;
        hombro: number | null;
      } = { ...baseRow };
      mockGetFirstAsync.mockImplementation(async () => ({ ...row }));
      mockRunAsync.mockImplementation(
        async (_sql: string, ...params: unknown[]) => {
          const [, espalda, hombro] = params as unknown[];
          row = {
            ...row,
            espalda: espalda as number | null,
            hombro: hombro as number | null,
          };
          return undefined;
        },
      );

      const repo = new TallaTemplateRepositoryImpl();

      // Simula un pull de sync cambiando `hombro` justo mientras el usuario
      // cambia `espalda` desde la UI, casi al mismo tiempo (ninguna de las
      // dos llamadas espera a que la otra termine).
      const [resultA, resultB] = await Promise.all([
        repo.update({ id: baseRow.id, espalda: 46 }),
        repo.update({ id: baseRow.id, hombro: 16 }),
      ]);

      expect(row.espalda).toBe(46);
      expect(row.hombro).toBe(16);
      expect([resultA.espalda, resultB.espalda]).toContain(46);
      expect([resultA.hombro, resultB.hombro]).toContain(16);
    });
  });
});
