import type { SQLiteDatabase } from "expo-sqlite";

import { notifyWriteCommitted, type WriteCommittedOptions } from "../writeCommitted";
import {
  deleteMeasurementByClientId,
  normalizeNullableChangedBy,
  normalizeNullableNotes,
  normalizeNullableNumber,
  type SyncStatus,
} from "./shared";

import {
  type PantalonMeasurement,
  generateDomainUuid,
  type UpsertPantalonDTO,
} from "../../../features/clients/domain/types";

interface PantalonMeasurementRow {
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
  sync_status: SyncStatus;
}

function mapPantalonRow(row: PantalonMeasurementRow): PantalonMeasurement {
  return {
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
  };
}

async function findPantalonRowByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<PantalonMeasurementRow | null> {
  return db.getFirstAsync<PantalonMeasurementRow>(
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
    WHERE client_id = ?
    LIMIT 1;
    `,
    clientId,
  );
}

export async function findPantalonByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<PantalonMeasurement | null> {
  const row = await findPantalonRowByClientId(db, clientId);
  if (!row) {
    return null;
  }

  return mapPantalonRow(row);
}

export async function upsertPantalonQuery(
  db: SQLiteDatabase,
  input: UpsertPantalonDTO,
  options: WriteCommittedOptions,
): Promise<PantalonMeasurement> {
  const nowIso = new Date().toISOString();
  const existing = await findPantalonRowByClientId(db, input.clientId);
  const id = existing?.id ?? generateDomainUuid();
  const createdAt = existing?.created_at ?? nowIso;
  const syncStatus: SyncStatus = "pending";
  const changedBy = normalizeNullableChangedBy(input.changedBy);
  const notes = normalizeNullableNotes(input.notes);

  const pantalonMeasurement: PantalonMeasurement = {
    id,
    clientId: input.clientId,
    largo: normalizeNullableNumber(input.largo),
    entrepierna: normalizeNullableNumber(input.entrepierna),
    cintura: normalizeNullableNumber(input.cintura),
    base: normalizeNullableNumber(input.base),
    tiro: normalizeNullableNumber(input.tiro),
    pierna: normalizeNullableNumber(input.pierna),
    rodilla: normalizeNullableNumber(input.rodilla),
    bota: normalizeNullableNumber(input.bota),
    changedBy,
    changedAt: nowIso,
    notes,
    createdAt,
    updatedAt: nowIso,
    syncStatus,
  };

  await db.runAsync(
    `
    INSERT INTO pantalon_measurements (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      largo = excluded.largo,
      entrepierna = excluded.entrepierna,
      cintura = excluded.cintura,
      base = excluded.base,
      tiro = excluded.tiro,
      pierna = excluded.pierna,
      rodilla = excluded.rodilla,
      bota = excluded.bota,
      changed_by = excluded.changed_by,
      changed_at = excluded.changed_at,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      sync_status = excluded.sync_status;
    `,
    pantalonMeasurement.id,
    pantalonMeasurement.clientId,
    pantalonMeasurement.largo,
    pantalonMeasurement.entrepierna,
    pantalonMeasurement.cintura,
    pantalonMeasurement.base,
    pantalonMeasurement.tiro,
    pantalonMeasurement.pierna,
    pantalonMeasurement.rodilla,
    pantalonMeasurement.bota,
    pantalonMeasurement.changedBy,
    pantalonMeasurement.changedAt,
    pantalonMeasurement.notes,
    pantalonMeasurement.createdAt,
    pantalonMeasurement.updatedAt,
    pantalonMeasurement.syncStatus,
  );

  notifyWriteCommitted(options);

  return pantalonMeasurement;
}

export async function deletePantalonQuery(
  db: SQLiteDatabase,
  clientId: string,
  options: WriteCommittedOptions,
): Promise<void> {
  await deleteMeasurementByClientId(
    db,
    "pantalon_measurements",
    "pantalon_measurement",
    clientId,
    options,
  );
}
