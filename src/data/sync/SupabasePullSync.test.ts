import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabasePullSync } from "./SupabasePullSync";

interface MockQueryResult {
  data: unknown[];
  error: null | { code: string };
}

interface MockQueryBuilder {
  select: (columns: string) => MockQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => MockQueryBuilder;
  limit: (value: number) => MockQueryBuilder;
  or: (value: string) => MockQueryBuilder;
  then: (
    onfulfilled?: ((value: MockQueryResult) => unknown) | null,
  ) => Promise<unknown>;
}

const mockQueryResults: Record<string, MockQueryResult[]> = {
  clients: [],
  camisa_measurements: [],
  pantalon_measurements: [],
  client_tallas: [],
  pricing_services: [],
  saco_measurements: [],
  chaleco_measurements: [],
  talla_templates: [],
  schedules: [],
  schedule_events: [],
  profiles: [],
  sync_delete_log: [],
};

const mockOrCalls: Record<string, string[]> = {
  clients: [],
  camisa_measurements: [],
  pantalon_measurements: [],
  client_tallas: [],
  pricing_services: [],
  saco_measurements: [],
  chaleco_measurements: [],
  talla_templates: [],
  schedules: [],
  schedule_events: [],
  profiles: [],
  sync_delete_log: [],
};

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockWithTransactionAsync = jest.fn(async (task: () => Promise<void>) =>
  task(),
);

function mockBuildQueryBuilder(
  table: string,
  result: MockQueryResult,
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    or: (value: string) => {
      mockOrCalls[table]?.push(value);
      return builder;
    },
    then: (onfulfilled) =>
      Promise.resolve(onfulfilled ? onfulfilled(result) : result),
  };

  return builder;
}

jest.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({
    from: (table: string): MockQueryBuilder => {
      const result = mockQueryResults[table]?.shift() ?? {
        data: [],
        error: null,
      };
      return mockBuildQueryBuilder(table, result);
    },
  }),
}));

jest.mock("../local/database", () => ({
  getDatabase: () => ({
    runAsync: (sql: string, ...params: unknown[]) =>
      mockRunAsync(sql, ...params),
    withTransactionAsync: (task: () => Promise<void>) =>
      mockWithTransactionAsync(task),
  }),
}));

describe("SupabasePullSync", () => {
  beforeEach(() => {
    mockQueryResults.clients = [];
    mockQueryResults.camisa_measurements = [];
    mockQueryResults.pantalon_measurements = [];
    mockQueryResults.client_tallas = [];
    mockQueryResults.pricing_services = [];
    mockQueryResults.saco_measurements = [];
    mockQueryResults.chaleco_measurements = [];
    mockQueryResults.talla_templates = [];
    mockQueryResults.schedules = [];
    mockQueryResults.schedule_events = [];
    mockQueryResults.profiles = [];
    mockQueryResults.sync_delete_log = [];
    mockOrCalls.clients = [];
    mockOrCalls.camisa_measurements = [];
    mockOrCalls.pantalon_measurements = [];
    mockOrCalls.client_tallas = [];
    mockOrCalls.pricing_services = [];
    mockOrCalls.saco_measurements = [];
    mockOrCalls.chaleco_measurements = [];
    mockOrCalls.talla_templates = [];
    mockOrCalls.schedules = [];
    mockOrCalls.schedule_events = [];
    mockOrCalls.profiles = [];
    mockOrCalls.sync_delete_log = [];
    mockRunAsync.mockReset();
    mockWithTransactionAsync.mockClear();
  });

  it("applies monotonic cursor filter for clients when checkpoint exists", async () => {
    // Arrange
    mockQueryResults.clients.push({
      data: [
        {
          id: "c-2",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return {
            updatedAt: "2026-05-01T09:59:00.000Z",
            id: "00000000-0000-0000-0000-000000000001",
          };
        }

        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    expect(mockOrCalls.clients).toContain(
      "updated_at.gt.2026-05-01T09:59:00.000Z,and(updated_at.eq.2026-05-01T09:59:00.000Z,id.gt.00000000-0000-0000-0000-000000000001)",
    );
  });

  it("applies incremental client upserts and advances client checkpoint", async () => {
    mockQueryResults.clients.push({
      data: [
        {
          id: "c-1",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    expect(mockRunAsync).toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith("clients", {
      id: "c-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
    });
  });

  it("incluye phones y cedula al insertar un cliente traído de Supabase", async () => {
    mockQueryResults.clients.push({
      data: [
        {
          id: "c-3",
          first_name: "Juan",
          last_name: "Pérez",
          phone: "3009998877",
          phones: JSON.stringify(["3101234567"]),
          cedula: "1020304050",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const clientCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO clients"),
    );
    expect(clientCalls).toHaveLength(1);
    const [, ...params] = clientCalls[0] ?? [];
    expect(params).toContain(JSON.stringify(["3101234567"]));
    expect(params).toContain("1020304050");
  });

  it("applies camisa incremental upserts including audit trail and advances checkpoint", async () => {
    mockQueryResults.camisa_measurements.push({
      data: [
        {
          id: "cam-1",
          client_id: "c-1",
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
          ancho_manga: 32,
          escote: 18,
          cuello: 38,
          brazo: 58,
          puno: 24,
          changed_by: "modista-1",
          changed_at: "2026-05-01T10:05:00.000Z",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:10:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const camisaCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO camisa_measurements"),
    );
    expect(camisaCalls).toHaveLength(1);
    const [sql, ...params] = camisaCalls[0] ?? [];
    expect(sql).toContain("changed_by");
    expect(sql).toContain("changed_at");
    expect(params).toContain("modista-1");
    expect(params).toContain("2026-05-01T10:05:00.000Z");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "camisa_measurements",
      {
        id: "cam-1",
        updatedAt: "2026-05-01T10:10:00.000Z",
      },
    );
  });

  it("applies pantalon incremental upserts including audit trail and advances checkpoint", async () => {
    mockQueryResults.pantalon_measurements.push({
      data: [
        {
          id: "pan-1",
          client_id: "c-1",
          largo: 102,
          cintura: 88,
          base: 110,
          tiro: 28,
          pierna: 54,
          rodilla: 44,
          bota: 38,
          changed_by: "modista-2",
          changed_at: "2026-05-01T10:08:00.000Z",
          notes: null,
          created_at: "2026-05-01T10:00:00.000Z",
          updated_at: "2026-05-01T10:12:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const pantalonCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO pantalon_measurements"),
    );
    expect(pantalonCalls).toHaveLength(1);
    const [sql, ...params] = pantalonCalls[0] ?? [];
    expect(sql).toContain("changed_by");
    expect(sql).toContain("changed_at");
    expect(params).toContain("modista-2");
    expect(params).toContain("2026-05-01T10:08:00.000Z");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "pantalon_measurements",
      {
        id: "pan-1",
        updatedAt: "2026-05-01T10:12:00.000Z",
      },
    );
  });

  it("applies client_tallas incremental upserts and advances checkpoint", async () => {
    mockQueryResults.client_tallas.push({
      data: [
        {
          id: "talla-1",
          client_id: "c-1",
          type: "camisa",
          value: "M",
          notes: null,
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const tallaCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO client_tallas"),
    );
    expect(tallaCalls).toHaveLength(1);
    const [, ...params] = tallaCalls[0] ?? [];
    expect(params).toContain("camisa");
    expect(params).toContain("M");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "client_tallas",
      { id: "talla-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies pricing_services incremental upserts and advances checkpoint", async () => {
    mockQueryResults.pricing_services.push({
      data: [
        {
          id: "price-1",
          name: "Dobladillo",
          price: 10000,
          category: "arreglo",
          notes: null,
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "pricing_services") {
          return {
            updatedAt: "2026-08-01T09:00:00.000Z",
            id: "00000000-0000-0000-0000-000000000002",
          };
        }
        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    expect(mockOrCalls.pricing_services).toContain(
      "updated_at.gt.2026-08-01T09:00:00.000Z,and(updated_at.eq.2026-08-01T09:00:00.000Z,id.gt.00000000-0000-0000-0000-000000000002)",
    );

    const pricingCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO pricing_services"),
    );
    expect(pricingCalls).toHaveLength(1);
    const [, ...params] = pricingCalls[0] ?? [];
    expect(params).toContain("Dobladillo");
    expect(params).toContain(10000);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "pricing_services",
      { id: "price-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies schedules incremental upserts and advances checkpoint", async () => {
    mockQueryResults.schedules.push({
      data: [
        {
          id: "schedule-1",
          date: "2026-08-10",
          time: "14:30",
          client_id: "c-1",
          notes: null,
          status: "pending",
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const scheduleCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO schedules"),
    );
    expect(scheduleCalls).toHaveLength(1);
    const [, ...params] = scheduleCalls[0] ?? [];
    expect(params).toContain("2026-08-10");
    expect(params).toContain("14:30");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "schedules",
      { id: "schedule-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies schedule_events incremental upserts using created_at as cursor", async () => {
    mockQueryResults.schedule_events.push({
      data: [
        {
          id: "event-1",
          schedule_id: "schedule-1",
          actor_id: "user-1",
          actor_display_name: "María Gómez",
          action: "created",
          changes: null,
          identity_verified: true,
          created_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const eventCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO schedule_events"),
    );
    expect(eventCalls).toHaveLength(1);
    const [, ...params] = eventCalls[0] ?? [];
    expect(params).toContain("event-1");
    expect(params).toContain("María Gómez");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "schedule_events",
      { id: "event-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies profiles incremental upserts into profiles_cache and advances checkpoint", async () => {
    mockQueryResults.profiles.push({
      data: [
        {
          id: "user-1",
          display_name: "María Gómez",
          role: "operario",
          is_shared_device: false,
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const profileCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO profiles_cache"),
    );
    expect(profileCalls).toHaveLength(1);
    const [, ...params] = profileCalls[0] ?? [];
    expect(params).toContain("user-1");
    expect(params).toContain("María Gómez");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "profiles",
      { id: "user-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("throws when schedules incremental fetch fails", async () => {
    mockQueryResults.schedules.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] schedules incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when client_tallas incremental fetch fails", async () => {
    mockQueryResults.client_tallas.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] client_tallas incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when pricing_services incremental fetch fails", async () => {
    mockQueryResults.pricing_services.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] pricing_services incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("applies client_talla delete by id when entity_type is client_talla", async () => {
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-4",
          entity_type: "client_talla",
          entity_id: "talla-99",
          deleted_at: "2026-08-01T14:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM client_tallas")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(false);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-4", updatedAt: "2026-08-01T14:00:00.000Z" },
    );
  });

  it("applies pricing_service delete by id when entity_type is pricing_service", async () => {
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-5",
          entity_type: "pricing_service",
          entity_id: "pricing-99",
          deleted_at: "2026-08-02T14:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM pricing_services")),
    ).toBe(true);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-5", updatedAt: "2026-08-02T14:00:00.000Z" },
    );
  });

  it("applies saco_measurements incremental upserts and advances checkpoint", async () => {
    mockQueryResults.saco_measurements.push({
      data: [
        {
          id: "saco-1",
          client_id: "c-1",
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
          notes: null,
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sacoCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO saco_measurements"),
    );
    expect(sacoCalls).toHaveLength(1);
    const [, ...params] = sacoCalls[0] ?? [];
    expect(params).toContain(38); // cuello
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "saco_measurements",
      { id: "saco-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies chaleco_measurements incremental upserts and advances checkpoint", async () => {
    mockQueryResults.chaleco_measurements.push({
      data: [
        {
          id: "chaleco-1",
          client_id: "c-1",
          espalda: 42,
          talle_trasero: 41,
          largo: 70,
          pecho: 98,
          cintura: 80,
          base: 100,
          escote: 18,
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const chalecoCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO chaleco_measurements"),
    );
    expect(chalecoCalls).toHaveLength(1);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "chaleco_measurements",
      { id: "chaleco-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies talla_templates incremental upserts and advances checkpoint", async () => {
    mockQueryResults.talla_templates.push({
      data: [
        {
          id: "template-1",
          name: "Molde estándar",
          type: "camisa",
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
          updated_at: "2026-08-01T10:05:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const templateCalls = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO talla_templates"),
    );
    expect(templateCalls).toHaveLength(1);
    const [, ...params] = templateCalls[0] ?? [];
    expect(params).toContain("Molde estándar");
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "talla_templates",
      { id: "template-1", updatedAt: "2026-08-01T10:05:00.000Z" },
    );
  });

  it("applies delete log idempotently and advances delete checkpoint", async () => {
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-1",
          entity_type: "client",
          entity_id: "c-1",
          deleted_at: "2026-05-01T11:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sqlStatements = mockRunAsync.mock.calls.map((call) => call[0]);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM schedules")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      {
        id: "del-1",
        updatedAt: "2026-05-01T11:00:00.000Z",
      },
    );
  });

  it("applies schedule delete by id when entity_type is schedule", async () => {
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-6",
          entity_type: "schedule",
          entity_id: "schedule-99",
          deleted_at: "2026-08-02T14:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);
    await pullSync.pullIncremental();

    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM schedules WHERE id = ?")),
    ).toBe(true);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-6", updatedAt: "2026-08-02T14:00:00.000Z" },
    );
  });

  it("keeps delete application idempotent when the same delete batch is replayed", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push(
      {
        data: [
          {
            id: "del-1",
            entity_type: "client",
            entity_id: "c-1",
            deleted_at: "2026-05-01T11:00:00.000Z",
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: "del-1",
            entity_type: "client",
            entity_id: "c-1",
            deleted_at: "2026-05-01T11:00:00.000Z",
          },
        ],
        error: null,
      },
    );

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();
    await pullSync.pullIncremental();

    // Assert
    const deleteClientStatements = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("DELETE FROM clients"),
    );
    const markDeleteSyncedStatements = mockRunAsync.mock.calls.filter((call) =>
      String(call[0]).includes("UPDATE sync_delete_log"),
    );

    expect(deleteClientStatements).toHaveLength(2);
    expect(markDeleteSyncedStatements).toHaveLength(2);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledTimes(2);
  });

  it("throws when clients incremental fetch fails", async () => {
    // Arrange
    mockQueryResults.clients.push({
      data: [],
      error: { code: "42501" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] clients incremental fetch failed: 42501",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when camisa measurements incremental fetch fails", async () => {
    // Arrange — clients returns empty (no error), camisa returns error
    mockQueryResults.camisa_measurements.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] camisa incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when pantalon measurements incremental fetch fails", async () => {
    // Arrange — clients + camisa return empty, pantalon returns error
    mockQueryResults.pantalon_measurements.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] pantalon incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when delete log incremental fetch fails", async () => {
    // Arrange — clients + camisa + pantalon return empty, delete log returns error
    mockQueryResults.sync_delete_log.push({
      data: [],
      error: { code: "42503" },
    });
    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[pull] delete log incremental fetch failed: 42503",
    );
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when cursor has a non-ISO timestamp (cursor injection guard)", async () => {
    // Arrange — cursor with invalid timestamp format
    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return {
            updatedAt: "'; DROP TABLE clients; --",
            id: "00000000-0000-0000-0000-000000000001",
          };
        }
        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[sync] invalid cursor values, aborting pull",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("throws when cursor has an invalid UUID (cursor injection guard)", async () => {
    // Arrange — cursor with valid timestamp but invalid UUID
    const checkpointRepository = {
      getCursor: jest.fn(async (scope: string) => {
        if (scope === "clients") {
          return { updatedAt: "2026-05-01T10:00:00.000Z", id: "not-a-uuid" };
        }
        return null;
      }),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };
    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act / Assert
    await expect(pullSync.pullIncremental()).rejects.toThrow(
      "[sync] invalid cursor values, aborting pull",
    );
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(checkpointRepository.advanceCursor).not.toHaveBeenCalled();
  });

  it("applies camisa_measurement delete by id when entity_type is camisa_measurement", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-2",
          entity_type: "camisa_measurement",
          entity_id: "cam-99",
          deleted_at: "2026-05-01T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) =>
        sql.includes("DELETE FROM camisa_measurements"),
      ),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    // Must NOT delete from clients table
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(false);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-2", updatedAt: "2026-05-01T12:00:00.000Z" },
    );
  });

  it("applies pantalon_measurement delete by id when entity_type is pantalon_measurement", async () => {
    // Arrange
    mockQueryResults.sync_delete_log.push({
      data: [
        {
          id: "del-3",
          entity_type: "pantalon_measurement",
          entity_id: "pan-99",
          deleted_at: "2026-05-01T13:00:00.000Z",
        },
      ],
      error: null,
    });

    const checkpointRepository = {
      getCursor: jest.fn(async () => null),
      advanceCursor: jest.fn(async () => Promise.resolve()),
    };

    const pullSync = new SupabasePullSync(checkpointRepository);

    // Act
    await pullSync.pullIncremental();

    // Assert
    const sqlStatements = mockRunAsync.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      sqlStatements.some((sql) =>
        sql.includes("DELETE FROM pantalon_measurements"),
      ),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("UPDATE sync_delete_log")),
    ).toBe(true);
    expect(
      sqlStatements.some((sql) => sql.includes("DELETE FROM clients")),
    ).toBe(false);
    expect(checkpointRepository.advanceCursor).toHaveBeenCalledWith(
      "sync_delete_log",
      { id: "del-3", updatedAt: "2026-05-01T13:00:00.000Z" },
    );
  });
});
