import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { MeasurementRepositoryImpl } from "./MeasurementRepositoryImpl";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetFirstAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown | null>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
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

describe("MeasurementRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetFirstAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T13:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("upserts camisa (insert) with pending sync status and parameterized query", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      client_id: "11111111-1111-4111-8111-111111111111",
      espalda: 44,
      hombro: 13,
      talle_delantero: null,
      talle_trasero: null,
      distancia: null,
      separacion: null,
      pecho: 92.5,
      cintura: 70.5,
      base: null,
      largo: 68,
      largo_manga: null,
      ancho_manga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      changed_by: null,
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: "Ajustar molde",
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "pending",
    });
    mockGenerateDomainUuid.mockReturnValueOnce(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );

    const repository = new MeasurementRepositoryImpl();

    const created = await repository.upsertCamisa({
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44,
      hombro: 13,
      pecho: 92.5,
      cintura: 70.5,
      largo: 68,
      notes: "  Ajustar molde  ",
    });

    expect(created).toEqual({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 44,
      hombro: 13,
      talleDelantero: null,
      talleTrasero: null,
      distancia: null,
      separacion: null,
      pecho: 92.5,
      cintura: 70.5,
      base: null,
      largo: 68,
      largoManga: null,
      anchoManga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      changedBy: null,
      changedAt: "2026-04-29T13:00:00.000Z",
      notes: "Ajustar molde",
      createdAt: "2026-04-29T13:00:00.000Z",
      updatedAt: "2026-04-29T13:00:00.000Z",
      syncStatus: "pending",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];

    expect(sql).toContain("INSERT INTO camisa_measurements");
    expect(sql).toContain("ON CONFLICT(client_id) DO UPDATE");
    expect(params).toEqual([
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      44,
      13,
      null,
      null,
      null,
      null,
      92.5,
      70.5,
      null,
      68,
      null,
      null,
      null, // escote
      null, // cuello
      null, // brazo
      null, // puno
      null, // changed_by
      "2026-04-29T13:00:00.000Z", // changed_at
      "Ajustar molde",
      "2026-04-29T13:00:00.000Z",
      "2026-04-29T13:00:00.000Z",
      "pending",
    ]);
  });

  it("upserts camisa preserving id and createdAt on conflict", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "existing-camisa",
      client_id: "11111111-1111-4111-8111-111111111111",
      espalda: 40,
      hombro: 12,
      talle_delantero: null,
      talle_trasero: null,
      distancia: null,
      separacion: null,
      pecho: null,
      cintura: null,
      base: null,
      largo: null,
      largo_manga: null,
      ancho_manga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      changed_by: "empleado-1",
      changed_at: "2026-04-01T10:00:00.000Z",
      notes: null,
      created_at: "2026-04-01T10:00:00.000Z",
      updated_at: "2026-04-01T10:00:00.000Z",
      sync_status: "synced",
    });
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "existing-camisa",
      client_id: "11111111-1111-4111-8111-111111111111",
      espalda: 41,
      hombro: null,
      talle_delantero: null,
      talle_trasero: null,
      distancia: null,
      separacion: null,
      pecho: null,
      cintura: null,
      base: null,
      largo: null,
      largo_manga: null,
      ancho_manga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      changed_by: "empleado-2",
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: null,
      created_at: "2026-04-01T10:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "pending",
    });

    const repository = new MeasurementRepositoryImpl();
    const created = await repository.upsertCamisa({
      clientId: "11111111-1111-4111-8111-111111111111",
      espalda: 41,
      changedBy: "empleado-2",
      notes: "",
    });

    expect(created.id).toBe("existing-camisa");
    expect(created.createdAt).toBe("2026-04-01T10:00:00.000Z");
    expect(created.updatedAt).toBe("2026-04-29T13:00:00.000Z");
    expect(created.changedBy).toBe("empleado-2");
    expect(created.changedAt).toBe("2026-04-29T13:00:00.000Z");
    expect(created.syncStatus).toBe("pending");
  });

  it("upserts pantalon and trims notes", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "pantalon-1",
      client_id: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      cintura: 80,
      base: null,
      tiro: null,
      pierna: null,
      rodilla: null,
      bota: 22,
      changed_by: null,
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: "Ajuste bota",
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "pending",
    });
    mockGenerateDomainUuid.mockReturnValueOnce("pantalon-1");

    const repository = new MeasurementRepositoryImpl();
    const created = await repository.upsertPantalon({
      clientId: "11111111-1111-4111-8111-111111111111",
      largo: 104,
      cintura: 80,
      bota: 22,
      changedBy: "  modista-1 ",
      notes: "  Ajuste bota  ",
    });

    expect(created.notes).toBe("Ajuste bota");
    expect(created.changedBy).toBe("modista-1");
    expect(created.changedAt).toBe("2026-04-29T13:00:00.000Z");
    const [sql] = mockRunAsync.mock.calls[0] ?? [];
    expect(sql).toContain("INSERT INTO pantalon_measurements");
  });

  it("findCamisaByClientId and findPantalonByClientId return null when missing", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const repository = new MeasurementRepositoryImpl();

    await expect(
      repository.findCamisaByClientId("client-1"),
    ).resolves.toBeNull();
    await expect(
      repository.findPantalonByClientId("client-1"),
    ).resolves.toBeNull();

    const [camisaSql, camisaClientId] = mockGetFirstAsync.mock.calls[0] ?? [];
    expect(camisaSql).toContain("FROM camisa_measurements");
    expect(camisaSql).toContain("WHERE client_id = ?");
    expect(camisaSql).toContain("cuello");
    expect(camisaSql).toContain("brazo");
    expect(camisaSql).toContain("puno");
    expect(camisaClientId).toBe("client-1");
  });

  it("triggers onWriteCommitted after successful upsert", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      client_id: "11111111-1111-4111-8111-111111111111",
      espalda: null,
      hombro: null,
      talle_delantero: null,
      talle_trasero: null,
      distancia: null,
      separacion: null,
      pecho: null,
      cintura: null,
      base: null,
      largo: null,
      largo_manga: null,
      ancho_manga: null,
      escote: null,
      cuello: null,
      brazo: null,
      puno: null,
      changed_by: null,
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: null,
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "pending",
    });
    mockGenerateDomainUuid.mockReturnValueOnce(
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
    );

    const onWriteCommitted = jest.fn<() => void>();
    const repository = new MeasurementRepositoryImpl({ onWriteCommitted });

    await repository.upsertCamisa({
      clientId: "11111111-1111-4111-8111-111111111111",
    });

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });

  it("does not fail upsert when onWriteCommitted rejects", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockResolvedValueOnce({});
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "abababab-abab-4bab-8bab-abababababab",
      client_id: "11111111-1111-4111-8111-111111111111",
      largo: null,
      cintura: null,
      base: null,
      tiro: null,
      pierna: null,
      rodilla: null,
      bota: null,
      changed_by: null,
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: null,
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "pending",
    });
    mockGenerateDomainUuid.mockReturnValueOnce(
      "abababab-abab-4bab-8bab-abababababab",
    );
    const onWriteCommitted = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("sync failure"));
    const repository = new MeasurementRepositoryImpl({ onWriteCommitted });

    await expect(
      repository.upsertPantalon({
        clientId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toBeDefined();
  });

  it("findCamisaByClientId retorna el registro mapeado cuando existe", async () => {
    // Arrange
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      client_id: "11111111-1111-4111-8111-111111111111",
      espalda: 44,
      hombro: 13,
      talle_delantero: null,
      talle_trasero: null,
      distancia: null,
      separacion: null,
      pecho: 92.5,
      cintura: 70.5,
      base: null,
      largo: 68,
      largo_manga: 60,
      ancho_manga: null,
      escote: null,
      cuello: 38,
      brazo: 58,
      puno: 24,
      changed_by: "modista-3",
      changed_at: "2026-04-29T13:00:00.000Z",
      notes: "Notas test",
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z",
      sync_status: "synced",
    });

    const repository = new MeasurementRepositoryImpl();

    // Act
    const result = await repository.findCamisaByClientId(
      "11111111-1111-4111-8111-111111111111",
    );

    // Assert
    expect(result).not.toBeNull();
    expect(result?.id).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(result?.cuello).toBe(38);
    expect(result?.brazo).toBe(58);
    expect(result?.puno).toBe(24);
    expect(result?.changedBy).toBe("modista-3");
    expect(result?.syncStatus).toBe("synced");
  });

  it("upsertCamisa propaga error cuando runAsync falla", async () => {
    // Arrange — findCamisaRow returns null (insert path), runAsync throws
    mockGetFirstAsync.mockResolvedValueOnce(null);
    mockRunAsync.mockRejectedValueOnce(new Error("disk full"));
    mockGenerateDomainUuid.mockReturnValueOnce(
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    );

    const repository = new MeasurementRepositoryImpl();

    // Act / Assert
    await expect(
      repository.upsertCamisa({
        clientId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toThrow("disk full");
  });
});
