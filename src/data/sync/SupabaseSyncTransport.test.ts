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
          id: "c-1",
          first_name: "Ana",
          last_name: "Torres",
          phone: "3001234567",
        }),
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
    it("upserts to 'pricing_services' table on success, using the real lowercase createdat/updatedat columns", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncPricingService(basePricing);

      expect(mockFrom).toHaveBeenCalledWith("pricing_services");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "price-1",
          name: "Dobladillo",
          price: 10000,
          category: "arreglo",
          createdat: "2026-08-01T10:00:00.000Z",
          updatedat: "2026-08-01T10:00:00.000Z",
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

  describe("syncDeleteLogEntry", () => {
    it("upserts to 'sync_delete_log' then deletes camisa, pantalon and client from cloud", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEq.mockResolvedValue({ error: null });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);

      expect(result).toEqual({ outcome: "synced" });
      // Log upsert
      expect(mockFrom).toHaveBeenCalledWith("sync_delete_log");
      // Cascade deletes: camisa, pantalon, client
      expect(mockFrom).toHaveBeenCalledWith("camisa_measurements");
      expect(mockFrom).toHaveBeenCalledWith("pantalon_measurements");
      expect(mockFrom).toHaveBeenCalledWith("clients");
      expect(mockDelete).toHaveBeenCalledTimes(3);
    });

    it("skips audit log and proceeds with cloud delete when sync_delete_log upsert fails with 42501 (RLS)", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      mockEq.mockResolvedValue({ error: null });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      // Despite audit log failure, cloud deletes should proceed and succeed
      expect(result).toEqual({ outcome: "synced" });
      expect(mockDelete).toHaveBeenCalledTimes(3);
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
        .mockResolvedValueOnce({ error: { code: "23503" } }); // client fails
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

    it("returns failed outcome when network throws", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("network error"));
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toEqual({ outcome: "deferred_offline" });
    });
  });
});
