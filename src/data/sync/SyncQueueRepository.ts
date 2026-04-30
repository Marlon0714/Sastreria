import { getDatabase } from "../local/database";

import type {
  SyncClientQueueItem,
  SyncMeasurementQueueItem,
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

interface MeasurementQueueRow {
  id: string;
  client_id: string;
  measured_at: string;
  pecho_cm: number;
  cintura_cm: number;
  cadera_cm: number;
  largo_cm: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function toClientQueueItem(row: ClientQueueRow): SyncClientQueueItem {
  return {
    entityType: "client",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
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

function toMeasurementQueueItem(
  row: MeasurementQueueRow,
): SyncMeasurementQueueItem {
  return {
    entityType: "measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    payload: {
      id: row.id,
      clientId: row.client_id,
      measuredAt: row.measured_at,
      pechoCm: row.pecho_cm,
      cinturaCm: row.cintura_cm,
      caderaCm: row.cadera_cm,
      largoCm: row.largo_cm,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    const measurementRows = await db.getAllAsync<MeasurementQueueRow>(
      `
      SELECT
        id,
        client_id,
        measured_at,
        pecho_cm,
        cintura_cm,
        cadera_cm,
        largo_cm,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    return [
      ...clientRows.map(toClientQueueItem),
      ...measurementRows.map(toMeasurementQueueItem),
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
    const table = entityType === "client" ? "clients" : "measurements";

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
