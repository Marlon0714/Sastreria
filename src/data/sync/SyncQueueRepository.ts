import { getDatabase } from "../local/database";

import type {
  SyncCamisaQueueItem,
  SyncClientQueueItem,
  SyncDeleteQueueItem,
  SyncPantalonQueueItem,
  SyncQueueItem,
} from "./types";

interface ClientQueueRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
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
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largo_manga: number | null;
  ancho_manga: number | null;
  escote: number | null;
  cuello: number | null;
  brazo: number | null;
  puno: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PantalonQueueRow {
  id: string;
  client_id: string;
  largo: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface DeleteQueueRow {
  id: string;
  entity_type: "client" | "camisa_measurement" | "pantalon_measurement";
  entity_id: string;
  deleted_at: string;
  sync_status: "pending" | "synced" | "error";
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
      pecho: row.pecho,
      cintura: row.cintura,
      base: row.base,
      largo: row.largo,
      largoManga: row.largo_manga,
      anchoManga: row.ancho_manga,
      escote: row.escote,
      cuello: row.cuello,
      brazo: row.brazo,
      puno: row.puno,
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
      cintura: row.cintura,
      base: row.base,
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
  markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void>;
  markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void>;
}

export class SyncQueueRepository implements SyncQueueRepositoryPort {
  async getPendingItems(limit: number): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const statuses = ["pending", "error"] as const;

    const clientRows = await db.getAllAsync<ClientQueueRow>(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone,
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
    );

    const camisaRows = await db.getAllAsync<CamisaQueueRow>(
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
        pecho,
        cintura,
        base,
        largo,
        largo_manga,
        ancho_manga,
        escote,
        cuello,
        brazo,
        puno,
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
    );

    const pantalonRows = await db.getAllAsync<PantalonQueueRow>(
      `
      SELECT
        id,
        client_id,
        largo,
        cintura,
        base,
        tiro,
        pierna,
        rodilla,
        bota,
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
    );

    const deleteRows = await db.getAllAsync<DeleteQueueRow>(
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
    );

    return [
      ...clientRows.map(toClientQueueItem),
      ...camisaRows.map(toCamisaQueueItem),
      ...pantalonRows.map(toPantalonQueueItem),
      ...deleteRows.map(toDeleteQueueItem),
    ]
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(0, limit);
  }

  async markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, "synced");
  }

  async markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, "error");
  }

  private async updateStatus(
    entityType: SyncQueueItem["entityType"],
    id: string,
    syncStatus: "synced" | "error",
  ): Promise<void> {
    const db = getDatabase();
    const tableMap: Record<SyncQueueItem["entityType"], string> = {
      client: "clients",
      camisa_measurement: "camisa_measurements",
      pantalon_measurement: "pantalon_measurements",
      delete_log: "sync_delete_log",
    };
    const table = tableMap[entityType];

    if (entityType === "delete_log") {
      await db.runAsync(
        `
        UPDATE ${table}
        SET sync_status = ?
        WHERE id = ?;
        `,
        syncStatus,
        id,
      );
      return;
    }

    await db.runAsync(
      `
      UPDATE ${table}
      SET sync_status = ?,
          updated_at = ?
      WHERE id = ?;
      `,
      syncStatus,
      new Date().toISOString(),
      id,
    );
  }
}
