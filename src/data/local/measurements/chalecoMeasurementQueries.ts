import type { SQLiteDatabase } from "expo-sqlite";

import { notifyWriteCommitted, type WriteCommittedOptions } from "../writeCommitted";
import {
  deleteMeasurementByClientId,
  normalizeNullableNotes,
  normalizeNullableNumber,
  type SyncStatus,
} from "./shared";

import {
  type ChalecoMeasurement,
  generateDomainUuid,
  type UpsertChalecoDTO,
} from "../../../features/clients/domain/types";

interface ChalecoMeasurementRow {
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
  sync_status: SyncStatus;
}

function mapChalecoRow(row: ChalecoMeasurementRow): ChalecoMeasurement {
  return {
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
  };
}

async function findChalecoRowByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<ChalecoMeasurementRow | null> {
  return db.getFirstAsync<ChalecoMeasurementRow>(
    `
      SELECT
        id, client_id, espalda, talle_trasero, largo, pecho_ajustado, pecho_ancho,
        cintura_ajustado, cintura_ancho, base_ajustado, base_ancho, escote, notes,
        created_at, updated_at, sync_status
      FROM chaleco_measurements
      WHERE client_id = ?
      LIMIT 1;
      `,
    clientId,
  );
}

export async function findChalecoByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<ChalecoMeasurement | null> {
  const row = await findChalecoRowByClientId(db, clientId);
  if (!row) return null;
  return mapChalecoRow(row);
}

export async function upsertChalecoQuery(
  db: SQLiteDatabase,
  input: UpsertChalecoDTO,
  options: WriteCommittedOptions,
): Promise<ChalecoMeasurement> {
  const nowIso = new Date().toISOString();
  const existing = await findChalecoRowByClientId(db, input.clientId);
  const id = existing?.id ?? generateDomainUuid();
  const createdAt = existing?.created_at ?? nowIso;
  const syncStatus: SyncStatus = "pending";

  const chalecoMeasurement: ChalecoMeasurement = {
    id,
    clientId: input.clientId,
    espalda: normalizeNullableNumber(input.espalda),
    talleTrasero: normalizeNullableNumber(input.talleTrasero),
    largo: normalizeNullableNumber(input.largo),
    pechoAjustado: normalizeNullableNumber(input.pechoAjustado),
    pechoAncho: normalizeNullableNumber(input.pechoAncho),
    cinturaAjustado: normalizeNullableNumber(input.cinturaAjustado),
    cinturaAncho: normalizeNullableNumber(input.cinturaAncho),
    baseAjustado: normalizeNullableNumber(input.baseAjustado),
    baseAncho: normalizeNullableNumber(input.baseAncho),
    escote: normalizeNullableNumber(input.escote),
    notes: normalizeNullableNotes(input.notes),
    createdAt,
    updatedAt: nowIso,
    syncStatus,
  };

  await db.runAsync(
    `
      INSERT INTO chaleco_measurements (
        id, client_id, espalda, talle_trasero, largo, pecho_ajustado, pecho_ancho,
        cintura_ajustado, cintura_ancho, base_ajustado, base_ancho, escote, notes,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        espalda = excluded.espalda,
        talle_trasero = excluded.talle_trasero,
        largo = excluded.largo,
        pecho_ajustado = excluded.pecho_ajustado,
        pecho_ancho = excluded.pecho_ancho,
        cintura_ajustado = excluded.cintura_ajustado,
        cintura_ancho = excluded.cintura_ancho,
        base_ajustado = excluded.base_ajustado,
        base_ancho = excluded.base_ancho,
        escote = excluded.escote,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        sync_status = excluded.sync_status;
      `,
    chalecoMeasurement.id,
    chalecoMeasurement.clientId,
    chalecoMeasurement.espalda,
    chalecoMeasurement.talleTrasero,
    chalecoMeasurement.largo,
    chalecoMeasurement.pechoAjustado,
    chalecoMeasurement.pechoAncho,
    chalecoMeasurement.cinturaAjustado,
    chalecoMeasurement.cinturaAncho,
    chalecoMeasurement.baseAjustado,
    chalecoMeasurement.baseAncho,
    chalecoMeasurement.escote,
    chalecoMeasurement.notes,
    chalecoMeasurement.createdAt,
    chalecoMeasurement.updatedAt,
    chalecoMeasurement.syncStatus,
  );

  notifyWriteCommitted(options);
  return chalecoMeasurement;
}

export async function deleteChalecoQuery(
  db: SQLiteDatabase,
  clientId: string,
  options: WriteCommittedOptions,
): Promise<void> {
  await deleteMeasurementByClientId(
    db,
    "chaleco_measurements",
    "chaleco_measurement",
    clientId,
    options,
  );
}
