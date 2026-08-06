import type {
  CamisaMeasurement,
  ChalecoMeasurement,
  Client,
  ClientTalla,
  PantalonMeasurement,
  SacoMeasurement,
} from "../../features/clients/domain/types";
import type { PricingService } from "../../features/pricing/domain/pricingService";
import type { ScheduleEvent } from "../../features/schedule/domain/events";
import type { Schedule } from "../../features/schedule/domain/types";
import type { TallaTemplate } from "../../features/tallas/domain/types";
import type { SyncTransport } from "./SyncTransport";
import type {
  SyncDeleteLogEntry,
  SyncTransportAttemptResult,
  SyncQueueItem,
  SyncClientQueueItem,
  SyncCamisaQueueItem,
  SyncPantalonQueueItem,
  SyncClientTallaQueueItem,
  SyncPricingServiceQueueItem,
  SyncSacoQueueItem,
  SyncChalecoQueueItem,
  SyncTallaTemplateQueueItem,
  SyncScheduleQueueItem,
  SyncScheduleEventQueueItem,
  SyncDeleteQueueItem,
} from "./types";

import { getSupabaseClient } from "../supabase/client";

export class SupabaseSyncTransport implements SyncTransport {
  async syncAll(items: SyncQueueItem[]): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        try {
          switch (item.entityType) {
            case "client":
              await this.syncClient((item as SyncClientQueueItem).payload);
              break;
            case "camisa_measurement":
              await this.syncCamisaMeasurement(
                (item as SyncCamisaQueueItem).payload,
              );
              break;
            case "pantalon_measurement":
              await this.syncPantalonMeasurement(
                (item as SyncPantalonQueueItem).payload,
              );
              break;
            case "client_talla":
              await this.syncClientTalla(
                (item as SyncClientTallaQueueItem).payload,
              );
              break;
            case "pricing_service":
              await this.syncPricingService(
                (item as SyncPricingServiceQueueItem).payload,
              );
              break;
            case "saco_measurement":
              await this.syncSacoMeasurement(
                (item as SyncSacoQueueItem).payload,
              );
              break;
            case "chaleco_measurement":
              await this.syncChalecoMeasurement(
                (item as SyncChalecoQueueItem).payload,
              );
              break;
            case "talla_template":
              await this.syncTallaTemplate(
                (item as SyncTallaTemplateQueueItem).payload,
              );
              break;
            case "schedule":
              await this.syncSchedule(
                (item as SyncScheduleQueueItem).payload,
              );
              break;
            case "schedule_event":
              await this.syncScheduleEvent(
                (item as SyncScheduleEventQueueItem).payload,
              );
              break;
            case "delete_log":
              await this.syncDeleteLogEntry(
                (item as SyncDeleteQueueItem).payload,
              );
              break;
          }
        } catch {
          // Loguear error si es necesario
        }
      }),
    );
  }

  /**
   * Upsert genérico que SIEMPRE marca sync_status: "synced" — estructuralmente
   * imposible de omitir para cualquier entidad nueva que se agregue después
   * (ver decisions-log 2026-08-01 / N-070: un registro nuevo sin este campo
   * viola el NOT NULL de Supabase en todas las tablas).
   */
  private async upsertSynced(
    table: string,
    row: Record<string, unknown>,
  ): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(table)
        .upsert({ ...row, sync_status: "synced" }, { onConflict: "id" });

      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }

      return { outcome: "synced" };
    } catch {
      return { outcome: "deferred_offline" };
    }
  }

  async syncClient(client: Client): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("clients", {
      id: client.id,
      first_name: client.firstName,
      last_name: client.lastName,
      phone: client.phone,
      phones:
        client.phones && client.phones.length > 0
          ? JSON.stringify(client.phones)
          : null,
      cedula: client.cedula ?? null,
      notes: client.notes,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    });
  }

  async syncCamisaMeasurement(
    measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("camisa_measurements", {
      id: measurement.id,
      client_id: measurement.clientId,
      espalda: measurement.espalda,
      hombro: measurement.hombro,
      talle_delantero: measurement.talleDelantero,
      talle_trasero: measurement.talleTrasero,
      distancia: measurement.distancia,
      separacion: measurement.separacion,
      pecho_ajustado: measurement.pechoAjustado,
      pecho_ancho: measurement.pechoAncho,
      cintura_ajustado: measurement.cinturaAjustado,
      cintura_ancho: measurement.cinturaAncho,
      base_ajustado: measurement.baseAjustado,
      base_ancho: measurement.baseAncho,
      largo: measurement.largo,
      manga_larga: measurement.mangaLarga,
      manga_corta: measurement.mangaCorta,
      escote: measurement.escote,
      cuello_normal: measurement.cuelloNormal,
      cuello_cruce: measurement.cuelloCruce,
      brazo: measurement.brazo,
      puno: measurement.puno,
      changed_by: measurement.changedBy,
      changed_at: measurement.changedAt,
      notes: measurement.notes,
      created_at: measurement.createdAt,
      updated_at: measurement.updatedAt,
    });
  }

  async syncPantalonMeasurement(
    measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("pantalon_measurements", {
      id: measurement.id,
      client_id: measurement.clientId,
      largo: measurement.largo,
      entrepierna: measurement.entrepierna,
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
    });
  }

  async syncClientTalla(
    talla: ClientTalla,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("client_tallas", {
      id: talla.id,
      client_id: talla.clientId,
      type: talla.type,
      value: talla.value,
      notes: talla.notes,
      created_at: talla.createdAt,
      updated_at: talla.updatedAt,
    });
  }

  async syncPricingService(
    service: PricingService,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("pricing_services", {
      id: service.id,
      name: service.name,
      price: service.price,
      category: service.category,
      notes: service.notes,
      created_at: service.createdAt,
      updated_at: service.updatedAt,
    });
  }

  async syncSacoMeasurement(
    measurement: SacoMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("saco_measurements", {
      id: measurement.id,
      client_id: measurement.clientId,
      espalda: measurement.espalda,
      hombro: measurement.hombro,
      talle_delantero: measurement.talleDelantero,
      talle_trasero: measurement.talleTrasero,
      distancia: measurement.distancia,
      separacion: measurement.separacion,
      pecho_ajustado: measurement.pechoAjustado,
      pecho_ancho: measurement.pechoAncho,
      cintura_ajustado: measurement.cinturaAjustado,
      cintura_ancho: measurement.cinturaAncho,
      base_ajustado: measurement.baseAjustado,
      base_ancho: measurement.baseAncho,
      largo: measurement.largo,
      manga_larga: measurement.mangaLarga,
      manga_corta: measurement.mangaCorta,
      escote: measurement.escote,
      cuello_normal: measurement.cuelloNormal,
      cuello_cruce: measurement.cuelloCruce,
      brazo: measurement.brazo,
      puno: measurement.puno,
      notes: measurement.notes,
      created_at: measurement.createdAt,
      updated_at: measurement.updatedAt,
    });
  }

  async syncChalecoMeasurement(
    measurement: ChalecoMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("chaleco_measurements", {
      id: measurement.id,
      client_id: measurement.clientId,
      espalda: measurement.espalda,
      talle_trasero: measurement.talleTrasero,
      largo: measurement.largo,
      pecho_ajustado: measurement.pechoAjustado,
      pecho_ancho: measurement.pechoAncho,
      cintura_ajustado: measurement.cinturaAjustado,
      cintura_ancho: measurement.cinturaAncho,
      base_ajustado: measurement.baseAjustado,
      base_ancho: measurement.baseAncho,
      escote: measurement.escote,
      notes: measurement.notes,
      created_at: measurement.createdAt,
      updated_at: measurement.updatedAt,
    });
  }

  async syncTallaTemplate(
    template: TallaTemplate,
  ): Promise<SyncTransportAttemptResult> {
    return this.upsertSynced("talla_templates", {
      id: template.id,
      name: template.name,
      type: template.type,
      espalda: template.espalda,
      hombro: template.hombro,
      talle_delantero: template.talleDelantero,
      talle_trasero: template.talleTrasero,
      distancia: template.distancia,
      separacion: template.separacion,
      pecho_ajustado: template.pechoAjustado,
      pecho_ancho: template.pechoAncho,
      cintura: template.cintura,
      cintura_ajustado: template.cinturaAjustado,
      cintura_ancho: template.cinturaAncho,
      base: template.base,
      base_ajustado: template.baseAjustado,
      base_ancho: template.baseAncho,
      largo: template.largo,
      manga_larga: template.mangaLarga,
      manga_corta: template.mangaCorta,
      escote: template.escote,
      cuello_normal: template.cuelloNormal,
      cuello_cruce: template.cuelloCruce,
      brazo: template.brazo,
      puno: template.puno,
      entrepierna: template.entrepierna,
      tiro: template.tiro,
      pierna: template.pierna,
      rodilla: template.rodilla,
      bota: template.bota,
      notes: template.notes,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    });
  }

  async syncSchedule(schedule: Schedule): Promise<SyncTransportAttemptResult> {
    // Requiere la migración v19 aplicada en Supabase (columnas nuevas +
    // CHECK de status actualizado), v21 (is_priority/status_locked), v24
    // (category) y v29 (client_id opcional + unregistered_client_name) —
    // ver SUPABASE_MIGRATIONS.md.
    return this.upsertSynced("schedules", {
      id: schedule.id,
      date: schedule.date ?? null,
      time: schedule.time ?? null,
      price: schedule.price ?? null,
      operario_id: schedule.operarioId ?? null,
      client_id: schedule.clientId ?? null,
      unregistered_client_name: schedule.unregisteredClientName ?? null,
      notes: schedule.notes ?? null,
      is_priority: schedule.isPriority,
      category: schedule.category,
      status: schedule.status,
      status_locked: schedule.statusLocked,
      ready_at: schedule.readyAt ?? null,
      delivered_at: schedule.deliveredAt ?? null,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt,
    });
  }

  async syncScheduleEvent(
    event: ScheduleEvent,
  ): Promise<SyncTransportAttemptResult> {
    // Requiere la tabla schedule_events creada en Supabase — ver
    // SUPABASE_MIGRATIONS.md v19. Es create-only: siempre es un INSERT
    // nuevo (el id es estable y el contenido nunca cambia), pero se usa
    // upsertSynced igual que las demás entidades para reintentos idempotentes.
    return this.upsertSynced("schedule_events", {
      id: event.id,
      schedule_id: event.scheduleId,
      actor_id: event.actorId,
      actor_display_name: event.actorDisplayName,
      action: event.action,
      changes: event.changes ?? null,
      identity_verified: event.identityVerified,
      created_at: event.createdAt,
    });
  }

  async syncDeleteLogEntry(
    entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult> {
    try {
      const supabase = getSupabaseClient();

      const { error: logError } = await supabase.from("sync_delete_log").upsert(
        {
          id: entry.id,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          deleted_at: entry.deletedAt,
          sync_status: "synced",
        },
        { onConflict: "id" },
      );

      if (logError) {
        const isInfraError =
          logError.code === "42501" || logError.code === "42P01";
        if (!isInfraError) {
          return this.toAttemptFailure(logError.code, logError.message);
        }
        console.warn(
          JSON.stringify({
            level: "warn",
            service: "SupabaseSyncTransport",
            message:
              "sync_delete_log upsert skipped due to infra error, proceeding with cloud delete",
            errorCode: logError.code,
          }),
        );
      }

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
      // Delete measurements and schedules first (cascade), then the client
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

      const { error: sacoError } = await supabase
        .from("saco_measurements")
        .delete()
        .eq("client_id", entry.entityId);
      if (sacoError) {
        return this.toAttemptFailure(sacoError.code, sacoError.message);
      }

      const { error: chalecoError } = await supabase
        .from("chaleco_measurements")
        .delete()
        .eq("client_id", entry.entityId);
      if (chalecoError) {
        return this.toAttemptFailure(chalecoError.code, chalecoError.message);
      }

      // Se lee el nombre ANTES de borrar nada, mismo criterio que
      // ClientRepositoryImpl.delete(): el turno conserva el nombre en vez
      // de quedar sin ninguno.
      const { data: clientRow } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("id", entry.entityId)
        .maybeSingle();
      const deletedClientLabel = clientRow
        ? `${clientRow.first_name} ${clientRow.last_name} (cliente eliminado)`
        : "Cliente eliminado";

      // Los turnos sobreviven al cliente borrado (ver ClientRepositoryImpl.delete()).
      const { error: scheduleError } = await supabase
        .from("schedules")
        .update({
          client_id: null,
          unregistered_client_name: deletedClientLabel,
        })
        .eq("client_id", entry.entityId);
      if (scheduleError) {
        return this.toAttemptFailure(scheduleError.code, scheduleError.message);
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

    if (entry.entityType === "client_talla") {
      const { error } = await supabase
        .from("client_tallas")
        .delete()
        .eq("id", entry.entityId);
      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }
      return null;
    }

    if (entry.entityType === "pricing_service") {
      const { error } = await supabase
        .from("pricing_services")
        .delete()
        .eq("id", entry.entityId);
      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }
      return null;
    }

    if (entry.entityType === "schedule") {
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", entry.entityId);
      if (error) {
        return this.toAttemptFailure(error.code, error.message);
      }
      return null;
    }

    if (entry.entityType === "talla_template") {
      const { error } = await supabase
        .from("talla_templates")
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

    return { outcome: "failed", errorCode, errorMessage };
  }
}
