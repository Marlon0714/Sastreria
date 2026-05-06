import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";
import type { SyncTransport } from "./SyncTransport";
import type { SyncDeleteLogEntry, SyncTransportAttemptResult } from "./types";
import { getSupabaseClient } from "../supabase/client";

/**
 * SyncTransport implementation that pushes local entities to Supabase.
 * Uses upsert (INSERT … ON CONFLICT DO UPDATE) keyed by `id` so retries
 * are idempotent and last-write-wins by `updated_at`.
 *
 * Errors return sanitized attempt outcomes without leaking PII.
 */
export class SupabaseSyncTransport implements SyncTransport {
  async syncClient(client: Client): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clients").upsert(
        {
          id: client.id,
          first_name: client.firstName,
          last_name: client.lastName,
          phone: client.phone,
          notes: client.notes,
          created_at: client.createdAt,
          updated_at: client.updatedAt,
        },
        { onConflict: "id" },
      );

      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }

      return { outcome: "synced" };
    } catch {
      return { outcome: "deferred_offline" };
    }
  }

  async syncCamisaMeasurement(
    measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("camisa_measurements").upsert(
        {
          id: measurement.id,
          client_id: measurement.clientId,
          espalda: measurement.espalda,
          hombro: measurement.hombro,
          talle_delantero: measurement.talleDelantero,
          talle_trasero: measurement.talleTrasero,
          distancia: measurement.distancia,
          separacion: measurement.separacion,
          pecho: measurement.pecho,
          cintura: measurement.cintura,
          base: measurement.base,
          largo: measurement.largo,
          largo_manga: measurement.largoManga,
          ancho_manga: measurement.anchoManga,
          escote: measurement.escote,
          cuello: measurement.cuello,
          brazo: measurement.brazo,
          puno: measurement.puno,
          changed_by: measurement.changedBy,
          changed_at: measurement.changedAt,
          notes: measurement.notes,
          created_at: measurement.createdAt,
          updated_at: measurement.updatedAt,
        },
        { onConflict: "id" },
      );

      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }

      return { outcome: "synced" };
    } catch {
      return { outcome: "deferred_offline" };
    }
  }

  async syncPantalonMeasurement(
    measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("pantalon_measurements").upsert(
        {
          id: measurement.id,
          client_id: measurement.clientId,
          largo: measurement.largo,
          cintura: measurement.cintura,
          base: measurement.base,
          tiro: measurement.tiro,
          pierna: measurement.pierna,
          rodilla: measurement.rodilla,
          bota: measurement.bota,
          changed_by: measurement.changedBy,
          changed_at: measurement.changedAt,
          notes: measurement.notes,
          created_at: measurement.createdAt,
          updated_at: measurement.updatedAt,
        },
        { onConflict: "id" },
      );

      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }

      return { outcome: "synced" };
    } catch {
      return { outcome: "deferred_offline" };
    }
  }

  async syncDeleteLogEntry(
    entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();

      // 1. Register the delete in the audit log (idempotent)
      const { error: logError } = await supabase.from("sync_delete_log").upsert(
        {
          id: entry.id,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          deleted_at: entry.deletedAt,
        },
        { onConflict: "id" },
      );

      if (logError) {
        return this.toAttemptFailure(logError.code, logError.message);
      }

      // 2. Execute the actual DELETE in cloud tables based on entity type
      const deleteResult = await this.executeCloudDelete(supabase, entry);
      if (deleteResult) {
        return deleteResult;
      }

      return { outcome: "synced" };
    } catch {
      return { outcome: "deferred_offline" };
    }
  }

  private async executeCloudDelete(
    supabase: ReturnType<typeof getSupabaseClient>,
    entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult | null> {
    if (entry.entityType === "client") {
      // Delete measurements first (cascade), then the client
      const { error: camisaError } = await supabase
        .from("camisa_measurements")
        .delete()
        .eq("client_id", entry.entityId);
      if (camisaError) {
        return this.toAttemptFailure(camisaError.code, camisaError.message);
      }

      const { error: pantalonError } = await supabase
        .from("pantalon_measurements")
        .delete()
        .eq("client_id", entry.entityId);
      if (pantalonError) {
        return this.toAttemptFailure(pantalonError.code, pantalonError.message);
      }

      const { error: clientError } = await supabase
        .from("clients")
        .delete()
        .eq("id", entry.entityId);
      if (clientError) {
        return this.toAttemptFailure(clientError.code, clientError.message);
      }

      return null;
    }

    if (entry.entityType === "camisa_measurement") {
      const { error } = await supabase
        .from("camisa_measurements")
        .delete()
        .eq("id", entry.entityId);
      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }
      return null;
    }

    if (entry.entityType === "pantalon_measurement") {
      const { error } = await supabase
        .from("pantalon_measurements")
        .delete()
        .eq("id", entry.entityId);
      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }
      return null;
    }

    return null;
  }

  private toAttemptFailure(
    errorCode?: string,
    errorMessage?: string,
  ): SyncTransportAttemptResult {
    const message = (errorMessage ?? "").toLowerCase();
    const looksOffline =
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("offline") ||
      !errorCode;

    if (looksOffline) {
      return { outcome: "deferred_offline" };
    }

    return { outcome: "failed", errorCode };
  }
}
