import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { ScheduleRepositoryImpl } from "./ScheduleRepositoryImpl";
import { computeSaldo } from "../../features/schedule/domain/saldo";

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

jest.mock("./database", () => ({
  getDatabase: () => mockDatabase,
}));

jest.mock("../../features/clients/domain/types", () => ({
  generateDomainUuid: () => mockGenerateDomainUuid(),
}));

const baseRow = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  client_id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  price: null,
  operario_id: null,
  notes: "Ajuste de traje",
  is_priority: 0,
  is_owner_flagged: 0,
  category: "arreglo" as const,
  status: "agendado" as const,
  status_locked: 0,
  ready_at: null,
  delivered_at: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
  sync_status: "pending" as const,
};

describe("ScheduleRepositoryImpl", () => {
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
    jest.setSystemTime(new Date("2026-08-01T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("getAll retorna turnos mapeados ordenados por fecha/hora ascendente", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getAll();

    expect(result).toEqual([
      {
        id: baseRow.id,
        clientId: baseRow.client_id,
        date: baseRow.date,
        time: baseRow.time,
        price: undefined,
        operarioId: undefined,
        notes: baseRow.notes,
        isPriority: false,
        isOwnerFlagged: false,
        category: "arreglo",
        status: baseRow.status,
        statusLocked: false,
        readyAt: undefined,
        deliveredAt: undefined,
        createdAt: baseRow.created_at,
        updatedAt: baseRow.updated_at,
        syncStatus: baseRow.sync_status,
      },
    ]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("ORDER BY date ASC, time ASC");
  });

  it("mapRow lee is_owner_flagged=1 como isOwnerFlagged: true", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ ...baseRow, is_owner_flagged: 1 });
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getById(baseRow.id);

    expect(result?.isOwnerFlagged).toBe(true);
  });

  it("getById retorna null si no existe", async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getById("nope");

    expect(result).toBeNull();
  });

  it("getByDate filtra por fecha exacta y ordena los prioritarios primero", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result).toHaveLength(1);
    const [sql, date] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE date = ?");
    expect(sql).toContain(
      "ORDER BY is_priority DESC, (time IS NULL) ASC, time ASC, created_at ASC",
    );
    expect(date).toBe("2026-08-10");
  });

  // El mock de getAllAsync no ejecuta SQLite real: simplemente devuelve el
  // array que se le pasa. Por eso estos casos NO verifican que el método
  // reordene nada en memoria (no lo hace) — verifican que el SQL generado
  // contiene el ORDER BY completo, que es lo único que este método controla;
  // el reordenamiento real lo hace SQLite al ejecutar esa query.
  it("getByDate: el mapeo preserva el orden de fila devuelto (prioritario primero) tal como lo entregaría SQLite", async () => {
    const priorityLate = {
      ...baseRow,
      id: "priority-late",
      is_priority: 1,
      time: "18:00",
    };
    const nonPriorityEarly = {
      ...baseRow,
      id: "non-priority-early",
      is_priority: 0,
      time: "08:00",
    };
    // Orden ya "resuelto" como lo devolvería SQLite con el ORDER BY nuevo:
    // is_priority DESC primero, sin importar la hora.
    mockGetAllAsync.mockResolvedValueOnce([priorityLate, nonPriorityEarly]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result.map((s) => s.id)).toEqual([
      "priority-late",
      "non-priority-early",
    ]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("(time IS NULL) ASC");
    expect(sql).toContain("created_at ASC");
  });

  it("getByDate: dentro del mismo grupo de prioridad, filas con hora vienen antes que filas sin hora", async () => {
    const withoutTime = { ...baseRow, id: "sin-hora", time: null };
    const withTime = { ...baseRow, id: "con-hora", time: "09:00" };
    // Simula el orden que produciría `(time IS NULL) ASC`: primero las que
    // tienen hora, luego las que no.
    mockGetAllAsync.mockResolvedValueOnce([withTime, withoutTime]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result.map((s) => s.id)).toEqual(["con-hora", "sin-hora"]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("(time IS NULL) ASC");
    expect(sql).toContain("created_at ASC");
  });

  it("getByDate: el SQL desempata dos turnos sin hora por created_at (no depende del orden de llegada por sync)", async () => {
    const createdFirst = {
      ...baseRow,
      id: "creado-primero",
      time: null,
      created_at: "2026-08-01T08:00:00.000Z",
    };
    const createdSecond = {
      ...baseRow,
      id: "creado-segundo",
      time: null,
      created_at: "2026-08-01T09:00:00.000Z",
    };
    mockGetAllAsync.mockResolvedValueOnce([createdFirst, createdSecond]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result.map((s) => s.id)).toEqual([
      "creado-primero",
      "creado-segundo",
    ]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain(
      "ORDER BY is_priority DESC, (time IS NULL) ASC, time ASC, created_at ASC",
    );
  });

  it("getByDate: caso combinado prioridad + hora + sin hora, verificado por el SQL completo", async () => {
    const rows = [
      { ...baseRow, id: "prioritario-sin-hora", is_priority: 1, time: null },
      { ...baseRow, id: "normal-con-hora", is_priority: 0, time: "10:00" },
      { ...baseRow, id: "normal-sin-hora", is_priority: 0, time: null },
    ];
    mockGetAllAsync.mockResolvedValueOnce(rows);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByDate("2026-08-10");

    expect(result).toHaveLength(3);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("is_priority DESC");
    expect(sql).toContain("(time IS NULL) ASC");
    expect(sql).toContain("time ASC");
    expect(sql).toContain("created_at ASC");
  });

  it("getByClient filtra por client_id", async () => {
    mockGetAllAsync.mockResolvedValueOnce([baseRow]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getByClient(baseRow.client_id);

    expect(result).toHaveLength(1);
    const [sql, clientId] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE client_id = ?");
    expect(clientId).toBe(baseRow.client_id);
  });

  it("getWithoutDate filtra los turnos sin fecha", async () => {
    mockGetAllAsync.mockResolvedValueOnce([{ ...baseRow, date: null }]);
    const repository = new ScheduleRepositoryImpl();

    const result = await repository.getWithoutDate();

    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBeUndefined();
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE date IS NULL");
  });

  describe("create", () => {
    it("deriva status 'pendiente' sin fecha ni operario y notifica onWriteCommitted", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.create({
        clientId: baseRow.client_id,
        notes: "Ajuste de traje",
      });

      expect(result).toEqual({
        id: baseRow.id,
        clientId: baseRow.client_id,
        date: undefined,
        time: undefined,
        price: undefined,
        operarioId: undefined,
        notes: "Ajuste de traje",
        isPriority: false,
        isOwnerFlagged: false,
        category: "arreglo",
        status: "pendiente",
        statusLocked: false,
        readyAt: undefined,
        deliveredAt: undefined,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
        syncStatus: "pending",
      });
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("deriva status 'agendado' con fecha", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        date: "2026-08-10",
      });

      expect(result.status).toBe("agendado");
    });

    it("deriva status 'en_proceso' con operario asignado", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        operarioId: "op-1",
      });

      expect(result.status).toBe("en_proceso");
    });

    it("usa 'arreglo' como category por defecto si no se envía", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
      });

      expect(result.category).toBe("arreglo");
      const params = mockRunAsync.mock.calls[0] ?? [];
      expect(params).toContain("arreglo");
    });

    it("respeta la category enviada (confeccion)", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        category: "confeccion",
      });

      expect(result.category).toBe("confeccion");
    });

    it("nace sin statusLocked, y con isPriority según lo enviado", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        isPriority: true,
      });

      expect(result.statusLocked).toBe(false);
      expect(result.isPriority).toBe(true);
    });

    it("persiste is_owner_flagged con default 0 (false) si no viene en el DTO", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
      });

      expect(result.isOwnerFlagged).toBe(false);
      const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(sql).toContain("is_owner_flagged");
      // Posición 10 (0-indexed) del INSERT: ..., is_priority, is_owner_flagged, category, ...
      expect(params[10]).toBe(0);
    });

    it("persiste isOwnerFlagged=true si viene en el DTO", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        isOwnerFlagged: true,
      });

      expect(result.isOwnerFlagged).toBe(true);
      const [, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(params[10]).toBe(1);
    });

    it("guarda el abono si se envía", async () => {
      mockGenerateDomainUuid.mockReturnValueOnce(baseRow.id);
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.create({
        clientId: baseRow.client_id,
        price: 100000,
        abono: 30000,
      });

      expect(result.abono).toBe(30000);
      const params = mockRunAsync.mock.calls[0] ?? [];
      expect(params).toContain(30000);
    });
  });

  describe("update", () => {
    it("lanza error si el turno no existe", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const repository = new ScheduleRepositoryImpl();

      await expect(
        repository.update("nope", { date: "2026-08-11" }),
      ).rejects.toThrow("Turno no encontrado");
    });

    it("recalcula status automáticamente y conserva campos no enviados", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseRow, status: "pendiente", date: null });
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.update(baseRow.id, {
        date: "2026-08-12",
      });

      expect(result.status).toBe("agendado");
      expect(result.date).toBe("2026-08-12");
      expect(result.notes).toBe(baseRow.notes);
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("conserva el abono existente si no se envía en el update", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        price: 100000,
        abono: 30000,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, { notes: "otra nota" });

      expect(result.abono).toBe(30000);
    });

    it("actualiza el abono si se envía", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        price: 100000,
        abono: 30000,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, { abono: 50000 });

      expect(result.abono).toBe(50000);
    });

    it("no recalcula status si ya está en un estado pegajoso", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, {
        operarioId: "op-2",
      });

      expect(result.status).toBe("entregado");
    });

    it("rechaza quitar el operario de un turno ya listo/entregado, y no escribe nada", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
        operario_id: "op-1",
      });
      const repository = new ScheduleRepositoryImpl();

      await expect(
        repository.update(baseRow.id, { operarioId: undefined }),
      ).rejects.toThrow(
        "No puedes quitar el operario de un turno ya listo para entregar o entregado.",
      );
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it("no recalcula status si quedó bloqueado por una corrección manual, aunque el operario siga asignado", async () => {
      // Regresión: antes de status_locked, corregir a "pendiente" con un
      // operario todavía asignado se revertía a "en_proceso" en el próximo
      // update() de cualquier campo, aunque no tuviera nada que ver.
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "pendiente",
        status_locked: 1,
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, {
        notes: "Nota sin relación con el estado",
      });

      expect(result.status).toBe("pendiente");
      expect(result.statusLocked).toBe(true);
    });

    it("conserva isPriority si no se envía, y lo actualiza si se envía", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        is_priority: 1,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, {
        isPriority: false,
      });

      expect(result.isPriority).toBe(false);
    });

    it("conserva isOwnerFlagged si no se envía, y lo actualiza si se envía", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        is_owner_flagged: 0,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, {
        isOwnerFlagged: true,
      });

      expect(result.isOwnerFlagged).toBe(true);
      const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(sql).toContain("is_owner_flagged = ?");
      // Posición 9 (0-indexed) del UPDATE: ..., is_priority = ?, is_owner_flagged = ?, category = ?, ...
      expect(params[9]).toBe(1);
    });

    it("conserva isOwnerFlagged existente si no viene en el update", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        is_owner_flagged: 1,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.update(baseRow.id, { notes: "otra nota" });

      expect(result.isOwnerFlagged).toBe(true);
    });
  });

  describe("markReady", () => {
    it("fija status listo_para_entregar y readyAt cuando hay un operario asignado", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      const result = await repository.markReady(baseRow.id);

      expect(result.status).toBe("listo_para_entregar");
      expect(result.readyAt).toBe("2026-08-01T10:00:00.000Z");
      expect(onWriteCommitted).toHaveBeenCalledTimes(1);
    });

    it("rechaza marcar listo sin operario asignado, y no escribe nada", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // operario_id: null
      const onWriteCommitted = jest.fn<() => void>();
      const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

      await expect(repository.markReady(baseRow.id)).rejects.toThrow(
        "Asigna un operario antes de marcar el turno como listo para entregar.",
      );
      expect(mockRunAsync).not.toHaveBeenCalled();
      expect(onWriteCommitted).not.toHaveBeenCalled();
    });
  });

  describe("markDelivered", () => {
    it("fija status entregado y deliveredAt desde cualquier estado previo, con operario asignado", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "pendiente",
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.markDelivered(baseRow.id);

      expect(result.status).toBe("entregado");
      expect(result.deliveredAt).toBe("2026-08-01T10:00:00.000Z");
    });

    it("rechaza marcar entregado sin operario asignado, y no escribe nada", async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseRow); // operario_id: null
      const repository = new ScheduleRepositoryImpl();

      await expect(repository.markDelivered(baseRow.id)).rejects.toThrow(
        "Asigna un operario antes de marcar el turno como entregado.",
      );
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it("con saldo pendiente, salda el turno automáticamente (abono = price) en el mismo UPDATE", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        operario_id: "op-1",
        price: 20000,
        abono: 5000,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.markDelivered(baseRow.id);

      expect(result.abono).toBe(20000);
      expect(computeSaldo(result)).toBe(0);
      // No se agregó ninguna escritura extra: sigue siendo un solo runAsync
      // dentro de la transacción de persistUpdate.
      expect(mockRunAsync).toHaveBeenCalledTimes(1);
    });

    it("sin precio, no toca el abono (no hay saldo que saldar)", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        operario_id: "op-1",
        price: null,
        abono: null,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.markDelivered(baseRow.id);

      expect(result.abono).toBeUndefined();
    });

    it("con abono ya igual al precio, deja el abono intacto (no hay saldo pendiente)", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        operario_id: "op-1",
        price: 20000,
        abono: 20000,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.markDelivered(baseRow.id);

      expect(result.abono).toBe(20000);
    });
  });

  describe("applyManualCorrection", () => {
    it("fija el status elegido sin ninguna regla", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "pendiente",
      );

      expect(result.status).toBe("pendiente");
    });

    it("deja el turno con statusLocked=true para que no se re-derive en el próximo update()", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "entregado",
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "pendiente",
      );

      expect(result.statusLocked).toBe(true);
      const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(sql).toContain("status_locked = ?");
      expect(params).toContain(1);
    });

    it("corregir a 'pendiente' limpia date y operario_id a null en el UPDATE (cierra N-108)", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "agendado",
        date: "2026-08-10",
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "pendiente",
      );

      expect(result.date).toBeUndefined();
      expect(result.operarioId).toBeUndefined();
      const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(sql).toContain("date = ?");
      expect(sql).toContain("operario_id = ?");
      // date es el 3er placeholder (0-indexed 2), operario_id el 6to (0-indexed 5)
      // del UPDATE: client_id, unregistered_client_name, date, time, price, abono, operario_id, ...
      expect(params[2]).toBeNull();
      expect(params[6]).toBeNull();
    });

    it("corregir a 'pendiente' también limpia is_priority", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "agendado",
        date: "2026-08-10",
        is_priority: 1,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "pendiente",
      );

      expect(result.isPriority).toBe(false);
      const [, ...params] = mockRunAsync.mock.calls[0] ?? [];
      expect(params[8]).toBe(0);
    });

    it("corregir a 'agendado' sin fecha lanza y no llama runAsync", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "pendiente",
        date: null,
      });
      const repository = new ScheduleRepositoryImpl();

      await expect(
        repository.applyManualCorrection(baseRow.id, "agendado"),
      ).rejects.toThrow('Asigna una fecha antes de corregir el turno a "Agendado".');
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it("corregir a 'agendado' con operario presente lo limpia", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "en_proceso",
        date: "2026-08-10",
        operario_id: "op-1",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "agendado",
      );

      expect(result.operarioId).toBeUndefined();
      expect(result.date).toBe("2026-08-10");
    });

    it.each(["en_proceso", "listo_para_entregar", "entregado"] as const)(
      "corregir a '%s' sin operario lanza y no escribe",
      async (targetStatus) => {
        mockGetFirstAsync.mockResolvedValueOnce({
          ...baseRow,
          status: "pendiente",
          operario_id: null,
        });
        const repository = new ScheduleRepositoryImpl();

        await expect(
          repository.applyManualCorrection(baseRow.id, targetStatus),
        ).rejects.toThrow(/Asigna un operario antes de corregir el turno a/);
        expect(mockRunAsync).not.toHaveBeenCalled();
      },
    );

    it("corregir a 'listo_para_entregar' estampa ready_at si venía null y limpia delivered_at", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "en_proceso",
        operario_id: "op-1",
        ready_at: null,
        delivered_at: "2026-07-15T00:00:00.000Z",
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "listo_para_entregar",
      );

      expect(result.readyAt).toBe("2026-08-01T10:00:00.000Z");
      expect(result.deliveredAt).toBeUndefined();
    });

    it("corregir a 'entregado' estampa delivered_at si venía null, sin tocar ready_at existente", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseRow,
        status: "listo_para_entregar",
        operario_id: "op-1",
        ready_at: "2026-07-10T00:00:00.000Z",
        delivered_at: null,
      });
      mockRunAsync.mockResolvedValueOnce({});
      const repository = new ScheduleRepositoryImpl();

      const result = await repository.applyManualCorrection(
        baseRow.id,
        "entregado",
      );

      expect(result.deliveredAt).toBe("2026-08-01T10:00:00.000Z");
      expect(result.readyAt).toBe("2026-07-10T00:00:00.000Z");
    });
  });

  describe("concurrencia", () => {
    it("dos updates casi simultáneos sobre el mismo turno no pierden ningún cambio (SELECT+UPDATE atómico)", async () => {
      // Reemplaza el mock "ingenuo" de withTransactionAsync (que solo hace
      // `await callback()`) por uno que reproduce la MISMA serialización de
      // serializeTransactions en database.ts: solo una transacción corre a
      // la vez, y la siguiente espera a que la anterior termine por completo
      // (incluida su escritura) antes de arrancar su propio SELECT. Así, si
      // el fix de persistUpdate() es correcto, el segundo update() siempre
      // lee el resultado YA COMMITEADO del primero, en vez de una foto vieja
      // — que es justo el escenario de pérdida de datos que se corrigió.
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

      let row = { ...baseRow, notes: "Nota original", price: null as number | null };
      mockGetFirstAsync.mockImplementation(async () => ({ ...row }));
      mockRunAsync.mockImplementation(async (_sql: string, ...params: unknown[]) => {
        const [
          ,
          ,
          ,
          ,
          price,
          ,
          ,
          notes,
        ] = params as unknown[];
        row = {
          ...row,
          price: price as number | null,
          notes: notes as string,
        };
        return {};
      });

      const repository = new ScheduleRepositoryImpl();

      // Simula un pull de sync actualizando `notes` justo mientras el
      // usuario cambia el `price` desde la UI, casi al mismo tiempo (ninguna
      // de las dos llamadas espera a que la otra termine).
      const [resultA, resultB] = await Promise.all([
        repository.update(baseRow.id, { notes: "Nota actualizada por sync" }),
        repository.update(baseRow.id, { price: 150000 }),
      ]);

      expect(row.notes).toBe("Nota actualizada por sync");
      expect(row.price).toBe(150000);
      expect([resultA.notes, resultB.notes]).toContain(
        "Nota actualizada por sync",
      );
      expect([resultA.price, resultB.price]).toContain(150000);
    });
  });

  it("delete borra el turno y registra entrada en sync_delete_log dentro de una transacción", async () => {
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    mockRunAsync.mockResolvedValue({});
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new ScheduleRepositoryImpl({ onWriteCommitted });

    await repository.delete(baseRow.id);

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(2);

    const [deleteSql, deleteId] = mockRunAsync.mock.calls[0] ?? [];
    expect(deleteSql).toContain("DELETE FROM schedules WHERE id = ?");
    expect(deleteId).toBe(baseRow.id);

    const [insertSql, ...insertParams] = mockRunAsync.mock.calls[1] ?? [];
    expect(insertSql).toContain("INSERT INTO sync_delete_log");
    expect(insertParams[0]).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(insertParams[1]).toBe("schedule");
    expect(insertParams[2]).toBe(baseRow.id);
    expect(insertParams[4]).toBe("pending");

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });
});
