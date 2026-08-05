import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabaseSyncTransport } from "./SupabaseSyncTransport";

// Mock the Supabase client module
type MockError = { code: string } | null;
const mockUpsert = jest.fn<() => Promise<{ error: MockError }>>();
const mockDelete = jest.fn<() => { eq: jest.Mock }>();
const mockEq = jest.fn<() => Promise<{ error: MockError }>>();

mockDelete.mockImplementation(() => ({ eq: mockEq }));

const mockFrom = jest.fn(() => ({ upsert: mockUpsert, delete: mockDelete }));

jest.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

const baseClient = {
  id: "c-1",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
  notes: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  syncStatus: "pending" as const,
  measurements: [],
};

const baseCamisa = {
  id: "cam-1",
  clientId: "c-1",
  espalda: 42,
  hombro: 14,
  talleDelantero: 43,
  talleTrasero: 41,
  distancia: 22,
  separacion: 10,
  pecho: 98,
  cintura: 80,
  base: 100,
  largo: 70,
  largoManga: 62,
  anchoManga: 32,
  escote: 18,
  cuello: null,
  brazo: null,
  puno: null,
  changedBy: "modista-1",
  changedAt: "2026-05-01T10:00:00.000Z",
  notes: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const basePantalon = {
  id: "pan-1",
  clientId: "c-1",
  largo: 102,
  cintura: 88,
  base: 110,
  tiro: 28,
  pierna: 54,
  rodilla: 44,
  bota: 38,
  changedBy: "modista-1",
  changedAt: "2026-05-01T10:00:00.000Z",
  notes: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseTalla = {
  id: "talla-1",
  clientId: "c-1",
  type: "camisa" as const,
  value: "M",
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const basePricing = {
  id: "price-1",
  name: "Dobladillo",
  price: 10000,
  category: "arreglo" as const,
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseSaco = {
  id: "saco-1",
  clientId: "c-1",
  espalda: 42,
  hombro: 14,
  talleDelantero: 43,
  talleTrasero: 41,
  distancia: 22,
  separacion: 10,
  pecho: 98,
  cintura: 80,
  base: 100,
  largo: 70,
  largoManga: 62,
  anchoManga: 30,
  escote: 18,
  cuello: 38,
  brazo: 56,
  puno: 22,
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseChaleco = {
  id: "chaleco-1",
  clientId: "c-1",
  espalda: 42,
  talleTrasero: 41,
  largo: 70,
  pecho: 98,
  cintura: 80,
  base: 100,
  escote: 18,
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseTallaTemplate = {
  id: "template-1",
  name: "Molde estándar",
  type: "camisa" as const,
  espalda: 42,
  hombro: 14,
  talleDelantero: 43,
  talleTrasero: 41,
  distancia: 22,
  separacion: 10,
  pecho: 98,
  cintura: 80,
  base: 100,
  largo: 70,
  largoManga: 62,
  anchoManga: 30,
  escote: 18,
  cuello: 38,
  brazo: 56,
  puno: 22,
  tiro: null,
  pierna: null,
  rodilla: null,
  bota: null,
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseSchedule = {
  id: "schedule-1",
  date: "2026-08-10",
  time: "14:30",
  clientId: "c-1",
  notes: "Ajuste de traje",
  isPriority: false,
  category: "arreglo" as const,
  status: "pendiente" as const,
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseScheduleEvent = {
  id: "event-1",
  scheduleId: "schedule-1",
  actorId: "user-1",
  actorDisplayName: "María Gómez",
  action: "created" as const,
  changes: undefined,
  identityVerified: true,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending" as const,
};

const baseDeleteLog = {
  id: "del-1",
  entityType: "client" as const,
  entityId: "c-1",
  deletedAt: "2026-05-01T10:05:00.000Z",
  syncStatus: "pending" as const,
};

describe("SupabaseSyncTransport", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockUpsert.mockReset();
    mockDelete.mockClear();
    mockEq.mockReset();
    mockDelete.mockImplementation(() => ({ eq: mockEq }));
  });

  describe("syncClient", () => {
    it("upserts to 'clients' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncClient(baseClient);

      expect(mockFrom).toHaveBeenCalledWith("clients");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "c-1",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
        }),
        { onConflict: "id" },
      );
    });

    it("incluye phones (como JSON) y cedula en el upsert", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncClient({
        ...baseClient,
        phones: ["3101234567", "6011234567"],
        cedula: "1020304050",
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phones: JSON.stringify(["3101234567", "6011234567"]),
          cedula: "1020304050",
        }),
        { onConflict: "id" },
      );
    });

    it("envía phones/cedula como null cuando no hay valores", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncClient(baseClient);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ phones: null, cedula: null }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome (no PII) when Supabase returns an error", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "23505" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "23505" });
      // Result must NOT contain PII (name, phone)
      expect(JSON.stringify(result)).not.toContain("Ana");
      expect(JSON.stringify(result)).not.toContain("3001234567");
    });
  });

  describe("syncCamisaMeasurement", () => {
    it("upserts to 'camisa_measurements' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncCamisaMeasurement(baseCamisa);

      expect(mockFrom).toHaveBeenCalledWith("camisa_measurements");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "cam-1",
          client_id: "c-1",
          espalda: 42,
          talle_delantero: 43,
          cuello: null,
          brazo: null,
          puno: null,
          changed_by: "modista-1",
          changed_at: "2026-05-01T10:00:00.000Z",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncCamisaMeasurement(baseCamisa);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncPantalonMeasurement", () => {
    it("upserts to 'pantalon_measurements' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncPantalonMeasurement(basePantalon);

      expect(mockFrom).toHaveBeenCalledWith("pantalon_measurements");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "pan-1",
          client_id: "c-1",
          largo: 102,
          cintura: 88,
          changed_by: "modista-1",
          changed_at: "2026-05-01T10:00:00.000Z",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncPantalonMeasurement(basePantalon);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncClientTalla", () => {
    it("upserts to 'client_tallas' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncClientTalla(baseTalla);

      expect(mockFrom).toHaveBeenCalledWith("client_tallas");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "talla-1",
          client_id: "c-1",
          type: "camisa",
          value: "M",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClientTalla(baseTalla);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncPricingService", () => {
    it("upserts to 'pricing_services' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncPricingService(basePricing);

      expect(mockFrom).toHaveBeenCalledWith("pricing_services");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "price-1",
          name: "Dobladillo",
          price: 10000,
          category: "arreglo",
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-01T10:00:00.000Z",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncPricingService(basePricing);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncSacoMeasurement", () => {
    it("upserts to 'saco_measurements' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncSacoMeasurement(baseSaco);

      expect(mockFrom).toHaveBeenCalledWith("saco_measurements");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "saco-1",
          client_id: "c-1",
          talle_delantero: 43,
          cuello: 38,
          brazo: 56,
          puno: 22,
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncSacoMeasurement(baseSaco);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncChalecoMeasurement", () => {
    it("upserts to 'chaleco_measurements' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncChalecoMeasurement(baseChaleco);

      expect(mockFrom).toHaveBeenCalledWith("chaleco_measurements");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "chaleco-1",
          client_id: "c-1",
          talle_trasero: 41,
          escote: 18,
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncChalecoMeasurement(baseChaleco);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncTallaTemplate", () => {
    it("upserts to 'talla_templates' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncTallaTemplate(baseTallaTemplate);

      expect(mockFrom).toHaveBeenCalledWith("talla_templates");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "template-1",
          name: "Molde estándar",
          type: "camisa",
          talle_delantero: 43,
          tiro: null,
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncTallaTemplate(baseTallaTemplate);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncSchedule", () => {
    it("upserts to 'schedules' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncSchedule(baseSchedule);

      expect(mockFrom).toHaveBeenCalledWith("schedules");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "schedule-1",
          date: "2026-08-10",
          time: "14:30",
          client_id: "c-1",
          category: "arreglo",
          status: "pendiente",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncSchedule(baseSchedule);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncScheduleEvent", () => {
    it("upserts to 'schedule_events' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncScheduleEvent(baseScheduleEvent);

      expect(mockFrom).toHaveBeenCalledWith("schedule_events");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "synced",
          id: "event-1",
          schedule_id: "schedule-1",
          actor_id: "user-1",
          actor_display_name: "María Gómez",
          action: "created",
          identity_verified: true,
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on Supabase failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncScheduleEvent(baseScheduleEvent);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });

  describe("syncDeleteLogEntry", () => {
    it("upserts to 'sync_delete_log' then deletes camisa, pantalon and client from cloud", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValue({ error: null });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      // Log upsert
      expect(mockFrom).toHaveBeenCalledWith("sync_delete_log");
      // Cascade deletes: camisa, pantalon, saco, chaleco, schedules, client
      expect(mockFrom).toHaveBeenCalledWith("camisa_measurements");
      expect(mockFrom).toHaveBeenCalledWith("pantalon_measurements");
      expect(mockFrom).toHaveBeenCalledWith("saco_measurements");
      expect(mockFrom).toHaveBeenCalledWith("chaleco_measurements");
      expect(mockFrom).toHaveBeenCalledWith("schedules");
      expect(mockFrom).toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(6);
    });

    it("skips audit log and proceeds with cloud delete when sync_delete_log upsert fails with 42501 (RLS)", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      mockEq.mockResolvedValue({ error: null });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      // Despite audit log failure, cloud deletes should proceed and succeed
      expect(result).toEqual({ outcome: "synced" });
      expect(mockDelete).toHaveBeenCalledTimes(6);
    });

    it("returns failed when sync_delete_log upsert fails with a non-infra error", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "23514" } }); // check violation
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "23514" });
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("returns failed when cascade camisa delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: { code: "42501" } }); // camisa fails
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });

    it("returns failed when client delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq
        .mockResolvedValueOnce({ error: null }) // camisa ok
        .mockResolvedValueOnce({ error: null }) // pantalon ok
        .mockResolvedValueOnce({ error: null }) // saco ok
        .mockResolvedValueOnce({ error: null }) // chaleco ok
        .mockResolvedValueOnce({ error: null }) // schedule ok
        .mockResolvedValueOnce({ error: { code: "23503" } }); // client fails
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "23503" });
    });

    it("returns failed when cascade saco delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq
        .mockResolvedValueOnce({ error: null }) // camisa ok
        .mockResolvedValueOnce({ error: null }) // pantalon ok
        .mockResolvedValueOnce({ error: { code: "23503" } }); // saco fails
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "23503" });
    });

    it("returns failed when cascade chaleco delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq
        .mockResolvedValueOnce({ error: null }) // camisa ok
        .mockResolvedValueOnce({ error: null }) // pantalon ok
        .mockResolvedValueOnce({ error: null }) // saco ok
        .mockResolvedValueOnce({ error: { code: "23503" } }); // chaleco fails
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "23503" });
    });

    it("deletes only camisa_measurement when entityType is camisa_measurement", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const camisaDeleteLog = {
        ...baseDeleteLog,
        entityType: "camisa_measurement" as const,
        entityId: "cam-1",
      };

      const result = await transport.syncDeleteLogEntry(camisaDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("camisa_measurements");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("deletes only client_tallas when entityType is client_talla", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const tallaDeleteLog = {
        ...baseDeleteLog,
        entityType: "client_talla" as const,
        entityId: "talla-1",
      };

      const result = await transport.syncDeleteLogEntry(tallaDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("client_tallas");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("deletes only pricing_services when entityType is pricing_service", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const pricingDeleteLog = {
        ...baseDeleteLog,
        entityType: "pricing_service" as const,
        entityId: "pricing-1",
      };

      const result = await transport.syncDeleteLogEntry(pricingDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("pricing_services");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("deletes only schedules when entityType is schedule", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const scheduleDeleteLog = {
        ...baseDeleteLog,
        entityType: "schedule" as const,
        entityId: "schedule-1",
      };

      const result = await transport.syncDeleteLogEntry(scheduleDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("schedules");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("deletes only talla_templates when entityType is talla_template", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const tallaTemplateDeleteLog = {
        ...baseDeleteLog,
        entityType: "talla_template" as const,
        entityId: "template-1",
      };

      const result = await transport.syncDeleteLogEntry(tallaTemplateDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("talla_templates");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("returns failed outcome when network throws", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("network error"));
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toEqual({ outcome: "deferred_offline" });
    });
  });
});
