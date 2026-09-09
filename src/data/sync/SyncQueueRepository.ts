import { getDatabase } from "../local/database";

import type { ScheduleEventAction } from "../../features/schedule/domain/events";
import type {
  SyncCamisaQueueItem,
  SyncChalecoQueueItem,
  SyncClientQueueItem,
  SyncDeleteQueueItem,
  SyncPantalonQueueItem,
  SyncPricingServiceQueueItem,
  SyncQueueItem,
  SyncSacoQueueItem,
  SyncScheduleEventQueueItem,
  SyncScheduleQueueItem,
  SyncTallaTemplateQueueItem,
} from "./types";

interface ClientQueueRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phones: string | null;
  cedula: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface CamisaQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho_ajustado: number | null;
  pecho_ancho: number | null;
  cintura_ajustado: number | null;
  cintura_ancho: number | null;
  base_ajustado: number | null;
  base_ancho: number | null;
  largo: number | null;
  manga_larga: number | null;
  manga_corta: number | null;
  escote: number | null;
  cuello_normal: number | null;
  cuello_cruce: number | null;
  brazo: number | null;
  puno: number | null;
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PantalonQueueRow {
  id: string;
  client_id: string;
  largo: number | null;
  entrepierna: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PricingServiceQueueRow {
  id: string;
  name: string;
  price: number;
  category: "arreglo" | "confeccion";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sync_status: "pending" | "synced" | "error";
}

interface SacoQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho_ajustado: number | null;
  pecho_ancho: number | null;
  cintura_ajustado: number | null;
  cintura_ancho: number | null;
  base_ajustado: number | null;
  base_ancho: number | null;
  largo: number | null;
  manga_larga: number | null;
  manga_corta: number | null;
  escote: number | null;
  cuello_normal: number | null;
  cuello_cruce: number | null;
  brazo: number | null;
  puno: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface ChalecoQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  talle_trasero: number | null;
  largo: number | null;
  pecho_ajustado: number | null;
  pecho_ancho: number | null;
  cintura_ajustado: number | null;
  cintura_ancho: number | null;
  base_ajustado: number | null;
  base_ancho: number | null;
  escote: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface TallaTemplateQueueRow {
  id: string;
  name: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho_ajustado: number | null;
  pecho_ancho: number | null;
  cintura: number | null;
  cintura_ajustado: number | null;
  cintura_ancho: number | null;
  base: number | null;
  base_ajustado: number | null;
  base_ancho: number | null;
  largo: number | null;
  manga_larga: number | null;
  manga_corta: number | null;
  escote: number | null;
  cuello_normal: number | null;
  cuello_cruce: number | null;
  brazo: number | null;
  puno: number | null;
  entrepierna: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface ScheduleQueueRow {
  id: string;
  date: string | null;
  time: string | null;
  price: number | null;
  abono: number | null;
  operario_id: string | null;
  client_id: string | null;
  unregistered_client_name: string | null;
  notes: string | null;
  is_priority: number;
  is_owner_flagged: number;
  category: "arreglo" | "confeccion";
  status:
    | "pendiente"
    | "agendado"
    | "en_proceso"
    | "listo_para_entregar"
    | "entregado";
  status_locked: number;
  ready_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface ScheduleEventQueueRow {
  id: string;
  schedule_id: string;
  actor_id: string;
  actor_display_name: string;
  action: string;
  changes: string | null;
  identity_verified: number;
  created_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface DeleteQueueRow {
  id: string;
  entity_type:
    | "client"
    | "camisa_measurement"
    | "pantalon_measurement"
    | "saco_measurement"
    | "chaleco_measurement"
    | "pricing_service"
    | "schedule"
    | "talla_template";
  entity_id: string;
  deleted_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PendingCountRow {
  total: number;
}

function parseClientQueuePhones(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as string[];
  } catch {
    return undefined;
  }
}

function toClientQueueItem(row: ClientQueueRow): SyncClientQueueItem {
  return {
    entityType: "client",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      phones: parseClientQueuePhones(row.phones),
      cedula: row.cedula ?? undefined,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
      measurements: [],
    },
  };
}

function toCamisaQueueItem(row: CamisaQueueRow): SyncCamisaQueueItem {
  return {
    entityType: "camisa_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pechoAjustado: row.pecho_ajustado,
      pechoAncho: row.pecho_ancho,
      cinturaAjustado: row.cintura_ajustado,
      cinturaAncho: row.cintura_ancho,
      baseAjustado: row.base_ajustado,
      baseAncho: row.base_ancho,
      largo: row.largo,
      mangaLarga: row.manga_larga,
      mangaCorta: row.manga_corta,
      escote: row.escote,
      cuelloNormal: row.cuello_normal,
      cuelloCruce: row.cuello_cruce,
      brazo: row.brazo,
      puno: row.puno,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toPantalonQueueItem(row: PantalonQueueRow): SyncPantalonQueueItem {
  return {
    entityType: "pantalon_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      largo: row.largo,
      entrepierna: row.entrepierna,
      cintura: row.cintura,
      base: row.base,
      tiro: row.tiro,
      pierna: row.pierna,
      rodilla: row.rodilla,
      bota: row.bota,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toPricingServiceQueueItem(
  row: PricingServiceQueueRow,
): SyncPricingServiceQueueItem {
  return {
    entityType: "pricing_service",
    id: row.id,
    updatedAt: row.updatedAt,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.sync_status,
    },
  };
}

function toSacoQueueItem(row: SacoQueueRow): SyncSacoQueueItem {
  return {
    entityType: "saco_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pechoAjustado: row.pecho_ajustado,
      pechoAncho: row.pecho_ancho,
      cinturaAjustado: row.cintura_ajustado,
      cinturaAncho: row.cintura_ancho,
      baseAjustado: row.base_ajustado,
      baseAncho: row.base_ancho,
      largo: row.largo,
      mangaLarga: row.manga_larga,
      mangaCorta: row.manga_corta,
      escote: row.escote,
      cuelloNormal: row.cuello_normal,
      cuelloCruce: row.cuello_cruce,
      brazo: row.brazo,
      puno: row.puno,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toChalecoQueueItem(row: ChalecoQueueRow): SyncChalecoQueueItem {
  return {
    entityType: "chaleco_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      talleTrasero: row.talle_trasero,
      largo: row.largo,
      pechoAjustado: row.pecho_ajustado,
      pechoAncho: row.pecho_ancho,
      cinturaAjustado: row.cintura_ajustado,
      cinturaAncho: row.cintura_ancho,
      baseAjustado: row.base_ajustado,
      baseAncho: row.base_ancho,
      escote: row.escote,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toTallaTemplateQueueItem(
  row: TallaTemplateQueueRow,
): SyncTallaTemplateQueueItem {
  return {
    entityType: "talla_template",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      name: row.name,
      type: row.type,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pechoAjustado: row.pecho_ajustado,
      pechoAncho: row.pecho_ancho,
      cintura: row.cintura,
      cinturaAjustado: row.cintura_ajustado,
      cinturaAncho: row.cintura_ancho,
      base: row.base,
      baseAjustado: row.base_ajustado,
      baseAncho: row.base_ancho,
      largo: row.largo,
      mangaLarga: row.manga_larga,
      mangaCorta: row.manga_corta,
      escote: row.escote,
      cuelloNormal: row.cuello_normal,
      cuelloCruce: row.cuello_cruce,
      brazo: row.brazo,
      puno: row.puno,
      entrepierna: row.entrepierna,
      tiro: row.tiro,
      pierna: row.pierna,
      rodilla: row.rodilla,
      bota: row.bota,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toScheduleQueueItem(row: ScheduleQueueRow): SyncScheduleQueueItem {
  return {
    entityType: "schedule",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      date: row.date ?? undefined,
      time: row.time ?? undefined,
      price: row.price ?? undefined,
      abono: row.abono ?? undefined,
      operarioId: row.operario_id ?? undefined,
      clientId: row.client_id ?? undefined,
      unregisteredClientName: row.unregistered_client_name ?? undefined,
      notes: row.notes ?? undefined,
      isPriority: row.is_priority === 1,
      isOwnerFlagged: row.is_owner_flagged === 1,
      category: row.category,
      status: row.status,
      statusLocked: row.status_locked === 1,
      readyAt: row.ready_at ?? undefined,
      deliveredAt: row.delivered_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toScheduleEventQueueItem(
  row: ScheduleEventQueueRow,
): SyncScheduleEventQueueItem {
  return {
    entityType: "schedule_event",
    id: row.id,
    updatedAt: row.created_at, // append-only: no hay updated_at propio
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      scheduleId: row.schedule_id,
      actorId: row.actor_id,
      actorDisplayName: row.actor_display_name,
      action: row.action as ScheduleEventAction,
      changes: row.changes ?? undefined,
      identityVerified: row.identity_verified === 1,
      createdAt: row.created_at,
      updatedAt: row.created_at,
      syncStatus: row.sync_status,
    },
  };
}

function toDeleteQueueItem(row: DeleteQueueRow): SyncDeleteQueueItem {
  return {
    entityType: "delete_log",
    id: row.id,
    updatedAt: row.deleted_at,
    syncStatus: row.sync_status,
    operationType: "delete",
    payload: {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      deletedAt: row.deleted_at,
      syncStatus: row.sync_status,
    },
  };
}

export interface SyncQueueRepositoryPort {
  getPendingItems(limit: number): Promise<SyncQueueItem[]>;
  hasPendingItems(): Promise<boolean>;
  markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
    updatedAt: string,
  ): Promise<void>;
  markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
    updatedAt: string,
  ): Promise<void>;
}

export class SyncQueueRepository implements SyncQueueRepositoryPort {
  async getPendingItems(limit: number): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const statuses = ["pending", "error"] as const;

    const [
      clientRows,
      camisaRows,
      pantalonRows,
      pricingRows,
      sacoRows,
      chalecoRows,
      tallaTemplateRows,
      scheduleRows,
      scheduleEventRows,
      deleteRows,
    ] = await Promise.all([
      db.getAllAsync<ClientQueueRow>(
        `
      SELECT
        id,
        first_name,
        last_name,
        phone,
        phones,
        cedula,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM clients
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<CamisaQueueRow>(
        `
      SELECT
        id,
        client_id,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho_ajustado,
        pecho_ancho,
        cintura_ajustado,
        cintura_ancho,
        base_ajustado,
        base_ancho,
        largo,
        manga_larga,
        manga_corta,
        escote,
        cuello_normal,
        cuello_cruce,
        brazo,
        puno,
        changed_by,
        changed_at,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM camisa_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<PantalonQueueRow>(
        `
      SELECT
        id,
        client_id,
        largo,
        entrepierna,
        cintura,
        base,
        tiro,
        pierna,
        rodilla,
        bota,
        changed_by,
        changed_at,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM pantalon_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<PricingServiceQueueRow>(
        `
      SELECT
        id,
        name,
        price,
        category,
        notes,
        createdAt,
        updatedAt,
        sync_status
      FROM pricing_services
      WHERE sync_status IN (?, ?)
      ORDER BY updatedAt ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<SacoQueueRow>(
        `
      SELECT
        id,
        client_id,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho_ajustado,
        pecho_ancho,
        cintura_ajustado,
        cintura_ancho,
        base_ajustado,
        base_ancho,
        largo,
        manga_larga,
        manga_corta,
        escote,
        cuello_normal,
        cuello_cruce,
        brazo,
        puno,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM saco_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<ChalecoQueueRow>(
        `
      SELECT
        id,
        client_id,
        espalda,
        talle_trasero,
        largo,
        pecho_ajustado,
        pecho_ancho,
        cintura_ajustado,
        cintura_ancho,
        base_ajustado,
        base_ancho,
        escote,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM chaleco_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<TallaTemplateQueueRow>(
        `
      SELECT
        id,
        name,
        type,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho_ajustado,
        pecho_ancho,
        cintura,
        cintura_ajustado,
        cintura_ancho,
        base,
        base_ajustado,
        base_ancho,
        largo,
        manga_larga,
        manga_corta,
        escote,
        cuello_normal,
        cuello_cruce,
        brazo,
        puno,
        entrepierna,
        tiro,
        pierna,
        rodilla,
        bota,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM talla_templates
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<ScheduleQueueRow>(
        `
      SELECT
        id,
        date,
        time,
        price,
        abono,
        operario_id,
        client_id,
        unregistered_client_name,
        notes,
        is_priority,
        is_owner_flagged,
        category,
        status,
        status_locked,
        ready_at,
        delivered_at,
        created_at,
        updated_at,
        sync_status
      FROM schedules
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<ScheduleEventQueueRow>(
        `
      SELECT
        id,
        schedule_id,
        actor_id,
        actor_display_name,
        action,
        changes,
        identity_verified,
        created_at,
        sync_status
      FROM schedule_events
      WHERE sync_status IN (?, ?)
      ORDER BY created_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
      db.getAllAsync<DeleteQueueRow>(
        `
      SELECT
        id,
        entity_type,
        entity_id,
        deleted_at,
        sync_status
      FROM sync_delete_log
      WHERE sync_status IN (?, ?)
      ORDER BY deleted_at ASC
      LIMIT ?;
      `,
        statuses[0],
        statuses[1],
        limit,
      ),
    ]);

    return [
      ...clientRows.map(toClientQueueItem),
      ...camisaRows.map(toCamisaQueueItem),
      ...pantalonRows.map(toPantalonQueueItem),
      ...pricingRows.map(toPricingServiceQueueItem),
      ...sacoRows.map(toSacoQueueItem),
      ...chalecoRows.map(toChalecoQueueItem),
      ...tallaTemplateRows.map(toTallaTemplateQueueItem),
      ...scheduleRows.map(toScheduleQueueItem),
      ...scheduleEventRows.map(toScheduleEventQueueItem),
      ...deleteRows.map(toDeleteQueueItem),
    ]
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(0, limit);
  }

  async hasPendingItems(): Promise<boolean> {
    const db = getDatabase();

    const countQuery = async (tableName: string): Promise<number> => {
      const result = await db.getFirstAsync<PendingCountRow>(
        `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE sync_status IN (?, ?);
        `,
        "pending",
        "error",
      );

      return result?.total ?? 0;
    };

    const [
      clientsCount,
      camisaCount,
      pantalonCount,
      pricingCount,
      sacoCount,
      chalecoCount,
      tallaTemplateCount,
      scheduleCount,
      scheduleEventCount,
      deleteCount,
    ] = await Promise.all([
      countQuery("clients"),
      countQuery("camisa_measurements"),
      countQuery("pantalon_measurements"),
      countQuery("pricing_services"),
      countQuery("saco_measurements"),
      countQuery("chaleco_measurements"),
      countQuery("talla_templates"),
      countQuery("schedules"),
      countQuery("schedule_events"),
      countQuery("sync_delete_log"),
    ]);

    return (
      clientsCount +
        camisaCount +
        pantalonCount +
        pricingCount +
        sacoCount +
        chalecoCount +
        tallaTemplateCount +
        scheduleCount +
        scheduleEventCount +
        deleteCount >
      0
    );
  }

  async markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
    updatedAt: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, updatedAt, "synced");
  }

  async markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
    updatedAt: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, updatedAt, "error");
  }

  private async updateStatus(
    entityType: SyncQueueItem["entityType"],
    id: string,
    updatedAt: string,
    syncStatus: "synced" | "error",
  ): Promise<void> {
    const db = getDatabase();
    const tableMap: Record<SyncQueueItem["entityType"], string> = {
      client: "clients",
      camisa_measurement: "camisa_measurements",
      pantalon_measurement: "pantalon_measurements",
      pricing_service: "pricing_services",
      saco_measurement: "saco_measurements",
      chaleco_measurement: "chaleco_measurements",
      talla_template: "talla_templates",
      schedule: "schedules",
      schedule_event: "schedule_events",
      delete_log: "sync_delete_log",
    };
    const table = tableMap[entityType];
    // El nombre real de la columna de versión varía por tabla:
    // - sync_delete_log y schedule_events son de solo-escritura (un log,
    //   nunca se editan tras crearse) y no tienen updated_at — usan su
    //   propio timestamp de creación/borrado.
    // - pricing_services quedó con createdAt/updatedAt en camelCase en
    //   SQLite (ver v8_pricing_services en migrations.ts) — el rename a
    //   snake_case documentado en SUPABASE_MIGRATIONS.md fue solo del lado
    //   de Supabase/Postgres, la tabla local nunca se tocó.
    const versionColumnMap: Record<SyncQueueItem["entityType"], string> = {
      client: "updated_at",
      camisa_measurement: "updated_at",
      pantalon_measurement: "updated_at",
      pricing_service: "updatedAt",
      saco_measurement: "updated_at",
      chaleco_measurement: "updated_at",
      talla_template: "updated_at",
      schedule: "updated_at",
      schedule_event: "created_at",
      delete_log: "deleted_at",
    };
    const versionColumn = versionColumnMap[entityType];

    // El filtro por versionColumn evita una actualización perdida: si el
    // usuario editó la fila DESPUÉS de que este intento de sync leyera el
    // payload que se envió pero ANTES de que la respuesta de red volviera,
    // sin este filtro se marcaría como "synced" una fila que en realidad
    // contiene datos nuevos que nunca se subieron — se pierden en silencio
    // porque getPendingItems() ya no la vuelve a seleccionar.
    await db.runAsync(
      `
      UPDATE ${table}
      SET sync_status = ?
      WHERE id = ? AND ${versionColumn} = ?;
      `,
      syncStatus,
      id,
      updatedAt,
    );
  }
}
