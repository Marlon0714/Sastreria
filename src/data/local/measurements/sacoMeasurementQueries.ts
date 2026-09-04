import type { SQLiteDatabase } from "expo-sqlite";

import { notifyWriteCommitted, type WriteCommittedOptions } from "../writeCommitted";
import {
  deleteMeasurementByClientId,
  normalizeNullableNotes,
  normalizeNullableNumber,
  type SyncStatus,
} from "./shared";

import {
  type SacoMeasurement,
  generateDomainUuid,
  type UpsertSacoDTO,
} from "../../../features/clients/domain/types";

interface SacoMeasurementRow {
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
  sync_status: SyncStatus;
}

function mapSacoRow(row: SacoMeasurementRow): SacoMeasurement {
  return {
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
  };
}

async function findSacoRowByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<SacoMeasurementRow | null> {
  return db.getFirstAsync<SacoMeasurementRow>(
    `
      SELECT
        id, client_id, espalda, hombro, talle_delantero, talle_trasero, distancia, separacion,
        pecho_ajustado, pecho_ancho, cintura_ajustado, cintura_ancho, base_ajustado, base_ancho,
        largo, manga_larga, manga_corta, escote, cuello_normal, cuello_cruce, brazo, puno, notes,
        created_at, updated_at, sync_status
      FROM saco_measurements
      WHERE client_id = ?
      LIMIT 1;
      `,
    clientId,
  );
}

export async function findSacoByClientId(
  db: SQLiteDatabase,
  clientId: string,
): Promise<SacoMeasurement | null> {
  const row = await findSacoRowByClientId(db, clientId);
  if (!row) return null;
  return mapSacoRow(row);
}

export async function upsertSacoQuery(
  db: SQLiteDatabase,
  input: UpsertSacoDTO,
  options: WriteCommittedOptions,
): Promise<SacoMeasurement> {
  const nowIso = new Date().toISOString();
  const existing = await findSacoRowByClientId(db, input.clientId);
  const id = existing?.id ?? generateDomainUuid();
  const createdAt = existing?.created_at ?? nowIso;
  const syncStatus: SyncStatus = "pending";

  const sacoMeasurement: SacoMeasurement = {
    id,
    clientId: input.clientId,
    espalda: normalizeNullableNumber(input.espalda),
    hombro: normalizeNullableNumber(input.hombro),
    talleDelantero: normalizeNullableNumber(input.talleDelantero),
    talleTrasero: normalizeNullableNumber(input.talleTrasero),
    distancia: normalizeNullableNumber(input.distancia),
    separacion: normalizeNullableNumber(input.separacion),
    pechoAjustado: normalizeNullableNumber(input.pechoAjustado),
    pechoAncho: normalizeNullableNumber(input.pechoAncho),
    cinturaAjustado: normalizeNullableNumber(input.cinturaAjustado),
    cinturaAncho: normalizeNullableNumber(input.cinturaAncho),
    baseAjustado: normalizeNullableNumber(input.baseAjustado),
    baseAncho: normalizeNullableNumber(input.baseAncho),
    largo: normalizeNullableNumber(input.largo),
    mangaLarga: normalizeNullableNumber(input.mangaLarga),
    mangaCorta: normalizeNullableNumber(input.mangaCorta),
    escote: normalizeNullableNumber(input.escote),
    cuelloNormal: normalizeNullableNumber(input.cuelloNormal),
    cuelloCruce: normalizeNullableNumber(input.cuelloCruce),
    brazo: normalizeNullableNumber(input.brazo),
    puno: normalizeNullableNumber(input.puno),
    notes: normalizeNullableNotes(input.notes),
    createdAt,
    updatedAt: nowIso,
    syncStatus,
  };

  await db.runAsync(
    `
      INSERT INTO saco_measurements (
        id, client_id, espalda, hombro, talle_delantero, talle_trasero, distancia, separacion,
        pecho_ajustado, pecho_ancho, cintura_ajustado, cintura_ancho, base_ajustado, base_ancho,
        largo, manga_larga, manga_corta, escote, cuello_normal, cuello_cruce, brazo, puno, notes,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        espalda = excluded.espalda,
        hombro = excluded.hombro,
        talle_delantero = excluded.talle_delantero,
        talle_trasero = excluded.talle_trasero,
        distancia = excluded.distancia,
        separacion = excluded.separacion,
        pecho_ajustado = excluded.pecho_ajustado,
        pecho_ancho = excluded.pecho_ancho,
        cintura_ajustado = excluded.cintura_ajustado,
        cintura_ancho = excluded.cintura_ancho,
        base_ajustado = excluded.base_ajustado,
        base_ancho = excluded.base_ancho,
        largo = excluded.largo,
        manga_larga = excluded.manga_larga,
        manga_corta = excluded.manga_corta,
        escote = excluded.escote,
        cuello_normal = excluded.cuello_normal,
        cuello_cruce = excluded.cuello_cruce,
        brazo = excluded.brazo,
        puno = excluded.puno,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        sync_status = excluded.sync_status;
      `,
    sacoMeasurement.id,
    sacoMeasurement.clientId,
    sacoMeasurement.espalda,
    sacoMeasurement.hombro,
    sacoMeasurement.talleDelantero,
    sacoMeasurement.talleTrasero,
    sacoMeasurement.distancia,
    sacoMeasurement.separacion,
    sacoMeasurement.pechoAjustado,
    sacoMeasurement.pechoAncho,
    sacoMeasurement.cinturaAjustado,
    sacoMeasurement.cinturaAncho,
    sacoMeasurement.baseAjustado,
    sacoMeasurement.baseAncho,
    sacoMeasurement.largo,
    sacoMeasurement.mangaLarga,
    sacoMeasurement.mangaCorta,
    sacoMeasurement.escote,
    sacoMeasurement.cuelloNormal,
    sacoMeasurement.cuelloCruce,
    sacoMeasurement.brazo,
    sacoMeasurement.puno,
    sacoMeasurement.notes,
    sacoMeasurement.createdAt,
    sacoMeasurement.updatedAt,
    sacoMeasurement.syncStatus,
  );

  notifyWriteCommitted(options);
  return sacoMeasurement;
}

export async function deleteSacoQuery(
  db: SQLiteDatabase,
  clientId: string,
  options: WriteCommittedOptions,
): Promise<void> {
  await deleteMeasurementByClientId(
    db,
    "saco_measurements",
    "saco_measurement",
    clientId,
    options,
  );
}
