import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabaseSyncTransport } from "./SupabaseSyncTransport";

// Mock the Supabase client module
const mockUpsert = jest.fn<() => Promise<{ error: null | { code: string } }>>();
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));

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

  describe("syncDeleteLogEntry", () => {
    it("upserts to 'sync_delete_log' table on success", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      const transport = new SupabaseSyncTransport();

      await transport.syncDeleteLogEntry(baseDeleteLog);

      expect(mockFrom).toHaveBeenCalledWith("sync_delete_log");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "del-1",
          entity_type: "client",
          entity_id: "c-1",
          deleted_at: "2026-05-01T10:05:00.000Z",
        }),
        { onConflict: "id" },
      );
    });

    it("returns failed outcome on delete push failure", async () => {
      mockUpsert.mockResolvedValueOnce({ error: { code: "42501" } });
      const transport = new SupabaseSyncTransport();

      const result = await transport.syncDeleteLogEntry(baseDeleteLog);
      expect(result).toMatchObject({ outcome: "failed", errorCode: "42501" });
    });
  });
});
