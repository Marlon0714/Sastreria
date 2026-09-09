import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabaseSyncTransport } from "./SupabaseSyncTransport";

// Mock the Supabase client module
type MockError = { code: string; message?: string } | null;
const mockUpsert = jest.fn<() => Promise<{ error: MockError }>>();
const mockDelete = jest.fn<() => { eq: jest.Mock }>();
const mockUpdate = jest.fn<() => { eq: jest.Mock }>();
const mockEq = jest.fn<() => Promise<{ error: MockError }>>();
const mockMaybeSingle =
  jest.fn<
    () => Promise<{
      data: { first_name: string; last_name: string } | null;
      error: MockError;
    }>
  >();
const mockSelectEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockSelectEq }));

mockDelete.mockImplementation(() => ({ eq: mockEq }));
mockUpdate.mockImplementation(() => ({ eq: mockEq }));

const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  delete: mockDelete,
  update: mockUpdate,
  select: mockSelect,
}));

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
  pechoAjustado: 98,
  pechoAncho: null,
  cinturaAjustado: 80,
  cinturaAncho: null,
  baseAjustado: 100,
  baseAncho: null,
  largo: 70,
  mangaLarga: 62,
  mangaCorta: null,
  escote: 18,
  cuelloNormal: null,
  cuelloCruce: null,
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
  entrepierna: 76,
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
  pechoAjustado: 98,
  pechoAncho: null,
  cinturaAjustado: 80,
  cinturaAncho: null,
  baseAjustado: 100,
  baseAncho: null,
  largo: 70,
  mangaLarga: 62,
  mangaCorta: null,
  escote: 18,
  cuelloNormal: 38,
  cuelloCruce: null,
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
  pechoAjustado: 98,
  pechoAncho: null,
  cinturaAjustado: 80,
  cinturaAncho: null,
  baseAjustado: 100,
  baseAncho: null,
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
  pechoAjustado: 98,
  pechoAncho: null,
  cintura: 80,
  cinturaAjustado: 80,
  cinturaAncho: null,
  base: 100,
  baseAjustado: 100,
  baseAncho: null,
  largo: 70,
  mangaLarga: 62,
  mangaCorta: null,
  escote: 18,
  cuelloNormal: 38,
  cuelloCruce: null,
  brazo: 56,
  puno: 22,
  entrepierna: null,
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
  isOwnerFlagged: false,
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
    mockUpdate.mockClear();
    mockEq.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockResolvedValue({
      data: { first_name: "Ana", last_name: "Torres" },
      error: null,
    });
    mockDelete.mockImplementation(() => ({ eq: mockEq }));
    mockUpdate.mockImplementation(() => ({ eq: mockEq }));
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
          pecho_ajustado: 98,
          cuello_normal: null,
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
          pecho_ajustado: 98,
          cuello_normal: 38,
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
          is_owner_flagged: false,
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

    it("incluye el abono en el upsert", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncSchedule({ ...baseSchedule, price: 100000, abono: 30000 });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ price: 100000, abono: 30000 }),
        { onConflict: "id" },
      );
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
      // Cascade: camisa/pantalon/saco/chaleco/client se borran; schedules
      // solo pierde la referencia (client_id = NULL), el turno sobrevive.
      expect(mockFrom).toHaveBeenCalledWith("camisa_measurements");
      expect(mockFrom).toHaveBeenCalledWith("pantalon_measurements");
      expect(mockFrom).toHaveBeenCalledWith("saco_measurements");
      expect(mockFrom).toHaveBeenCalledWith("chaleco_measurements");
      expect(mockFrom).toHaveBeenCalledWith("schedules");
      expect(mockFrom).toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(5);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it("skips audit log and proceeds with cloud delete when sync_delete_log upsert fails with 42501 (RLS)", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      mockEq.mockResolvedValue({ error: null });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      // Despite audit log failure, cloud deletes should proceed and succeed
      expect(result).toEqual({ outcome: "synced" });
      expect(mockDelete).toHaveBeenCalledTimes(5);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
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

    it("deletes only saco_measurements when entityType is saco_measurement", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const sacoDeleteLog = {
        ...baseDeleteLog,
        entityType: "saco_measurement" as const,
        entityId: "saco-1",
      };

      const result = await transport.syncDeleteLogEntry(sacoDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("saco_measurements");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("returns failed when saco_measurement delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();
      const sacoDeleteLog = {
        ...baseDeleteLog,
        entityType: "saco_measurement" as const,
        entityId: "saco-1",
      };

      const result = await transport.syncDeleteLogEntry(sacoDeleteLog);

      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });

    it("deletes only chaleco_measurements when entityType is chaleco_measurement", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const chalecoDeleteLog = {
        ...baseDeleteLog,
        entityType: "chaleco_measurement" as const,
        entityId: "chaleco-1",
      };

      const result = await transport.syncDeleteLogEntry(chalecoDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("chaleco_measurements");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("returns failed when chaleco_measurement delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();
      const chalecoDeleteLog = {
        ...baseDeleteLog,
        entityType: "chaleco_measurement" as const,
        entityId: "chaleco-1",
      };

      const result = await transport.syncDeleteLogEntry(chalecoDeleteLog);

      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });

    it("deletes only schedule_events when entityType is schedule_event", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const scheduleEventDeleteLog = {
        ...baseDeleteLog,
        entityType: "schedule_event" as const,
        entityId: "event-1",
      };

      const result = await transport.syncDeleteLogEntry(scheduleEventDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      expect(mockFrom).toHaveBeenCalledWith("schedule_events");
      expect(mockFrom).not.toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("returns failed when schedule_event delete fails", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();
      const scheduleEventDeleteLog = {
        ...baseDeleteLog,
        entityType: "schedule_event" as const,
        entityId: "event-1",
      };

      const result = await transport.syncDeleteLogEntry(scheduleEventDeleteLog);

      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });

    it("nunca reporta synced (sin haber borrado nada) para un entityType desconocido — falla ruidosamente", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();
      const unknownDeleteLog = {
        ...baseDeleteLog,
        // Simula un SyncEntityType nuevo agregado a types.ts sin su rama
        // correspondiente en executeCloudDelete — el `default` exhaustivo
        // debe lanzar, nunca devolver `null` (que el caller confundiría
        // con "no hacía falta borrar nada" y marcaría como sincronizado).
        entityType: "unknown_entity" as unknown as typeof baseDeleteLog.entityType,
        entityId: "x-1",
      };

      const result = await transport.syncDeleteLogEntry(unknownDeleteLog);

      expect(result.outcome).toBe("failed");
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("clasificación de errores de red vs errores desconocidos", () => {
    it("un error con código de red conocido (ECONNREFUSED) se trata como offline aunque el mensaje no lo mencione", async () => {
      mockUpsert.mockResolvedValueOnce({
        error: { code: "ECONNREFUSED", message: "connect failed" },
      });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);

      expect(result).toEqual({ outcome: "deferred_offline" });
    });

    it("un error de red genérico sin código pero con mensaje reconocible se trata como offline", async () => {
      mockUpsert.mockResolvedValueOnce({
        error: { code: "", message: "Network request failed" },
      });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);

      expect(result).toEqual({ outcome: "deferred_offline" });
    });

    it("un error totalmente desconocido, sin código ni evidencia de red, se trata como fallo real (no offline)", async () => {
      // Antes: `!errorCode` por sí solo bastaba para asumir offline, así que
      // este caso (ej. un error de esquema/RLS sin `.code`) quedaba
      // atascado como backlog offline para siempre, sin consumir
      // reintentos ni llegar nunca a markAsError.
      mockUpsert.mockResolvedValueOnce({
        error: { code: "", message: "Malformed payload for column price" },
      });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);

      expect(result.outcome).toBe("failed");
    });

    it("una excepción JS desconocida (no de red) lanzada antes de la respuesta HTTP se trata como fallo real", async () => {
      mockUpsert.mockRejectedValueOnce(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
      );
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);

      expect(result.outcome).toBe("failed");
      expect(result).toMatchObject({ errorCode: "unexpected_error" });
    });

    it("una excepción JS de red (fetch failed) lanzada antes de la respuesta HTTP se sigue tratando como offline", async () => {
      mockUpsert.mockRejectedValueOnce(new TypeError("Network request failed"));
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncClient(baseClient);

      expect(result).toEqual({ outcome: "deferred_offline" });
    });
  });
});
