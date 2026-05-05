import { getDatabase } from "./database";

import type { MeasurementRepository } from "../../features/clients/domain/repository";
import {
  type CamisaMeasurement,
  generateDomainUuid,
  type PantalonMeasurement,
  type UpsertCamisaDTO,
  type UpsertPantalonDTO,
} from "../../features/clients/domain/types";

type WriteCommittedCallback = () => void | Promise<void>;

interface MeasurementRepositoryImplOptions {
  onWriteCommitted?: WriteCommittedCallback;
}

type SyncStatus = "pending" | "synced" | "error";

interface CamisaMeasurementRow {
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
  sync_status: SyncStatus;
}

interface PantalonMeasurementRow {
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
  sync_status: SyncStatus;
}

function normalizeNullableNumber(
  value: number | null | undefined,
): number | null {
  return value ?? null;
}

function normalizeNullableNotes(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function mapCamisaRow(row: CamisaMeasurementRow): CamisaMeasurement {
  return {
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
  };
}

function mapPantalonRow(row: PantalonMeasurementRow): PantalonMeasurement {
  return {
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
  };
}

export class MeasurementRepositoryImpl implements MeasurementRepository {
  constructor(
    private readonly options: MeasurementRepositoryImplOptions = {},
  ) {}

  async upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const existing = await this.findCamisaRowByClientId(input.clientId);
    const id = existing?.id ?? generateDomainUuid();
    const createdAt = existing?.created_at ?? nowIso;
    const syncStatus: SyncStatus = "pending";
    const notes = normalizeNullableNotes(input.notes);

    const camisaMeasurement: CamisaMeasurement = {
      id,
      clientId: input.clientId,
      espalda: normalizeNullableNumber(input.espalda),
      hombro: normalizeNullableNumber(input.hombro),
      talleDelantero: normalizeNullableNumber(input.talleDelantero),
      talleTrasero: normalizeNullableNumber(input.talleTrasero),
      distancia: normalizeNullableNumber(input.distancia),
      separacion: normalizeNullableNumber(input.separacion),
      pecho: normalizeNullableNumber(input.pecho),
      cintura: normalizeNullableNumber(input.cintura),
      base: normalizeNullableNumber(input.base),
      largo: normalizeNullableNumber(input.largo),
      largoManga: normalizeNullableNumber(input.largoManga),
      anchoManga: normalizeNullableNumber(input.anchoManga),
      escote: normalizeNullableNumber(input.escote),
      cuello: normalizeNullableNumber(input.cuello),
      brazo: normalizeNullableNumber(input.brazo),
      puno: normalizeNullableNumber(input.puno),
      notes,
      createdAt,
      updatedAt: nowIso,
      syncStatus,
    };

    await db.runAsync(
      `
      INSERT INTO camisa_measurements (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        espalda = excluded.espalda,
        hombro = excluded.hombro,
        talle_delantero = excluded.talle_delantero,
        talle_trasero = excluded.talle_trasero,
        distancia = excluded.distancia,
        separacion = excluded.separacion,
        pecho = excluded.pecho,
        cintura = excluded.cintura,
        base = excluded.base,
        largo = excluded.largo,
        largo_manga = excluded.largo_manga,
        ancho_manga = excluded.ancho_manga,
        escote = excluded.escote,
        cuello = excluded.cuello,
        brazo = excluded.brazo,
        puno = excluded.puno,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        sync_status = excluded.sync_status;
      `,
      camisaMeasurement.id,
      camisaMeasurement.clientId,
      camisaMeasurement.espalda,
      camisaMeasurement.hombro,
      camisaMeasurement.talleDelantero,
      camisaMeasurement.talleTrasero,
      camisaMeasurement.distancia,
      camisaMeasurement.separacion,
      camisaMeasurement.pecho,
      camisaMeasurement.cintura,
      camisaMeasurement.base,
      camisaMeasurement.largo,
      camisaMeasurement.largoManga,
      camisaMeasurement.anchoManga,
      camisaMeasurement.escote,
      camisaMeasurement.cuello,
      camisaMeasurement.brazo,
      camisaMeasurement.puno,
      camisaMeasurement.notes,
      camisaMeasurement.createdAt,
      camisaMeasurement.updatedAt,
      camisaMeasurement.syncStatus,
    );

    this.notifyWriteCommitted();

    return camisaMeasurement;
  }

  async upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const existing = await this.findPantalonRowByClientId(input.clientId);
    const id = existing?.id ?? generateDomainUuid();
    const createdAt = existing?.created_at ?? nowIso;
    const syncStatus: SyncStatus = "pending";
    const notes = normalizeNullableNotes(input.notes);

    const pantalonMeasurement: PantalonMeasurement = {
      id,
      clientId: input.clientId,
      largo: normalizeNullableNumber(input.largo),
      cintura: normalizeNullableNumber(input.cintura),
      base: normalizeNullableNumber(input.base),
      tiro: normalizeNullableNumber(input.tiro),
      pierna: normalizeNullableNumber(input.pierna),
      rodilla: normalizeNullableNumber(input.rodilla),
      bota: normalizeNullableNumber(input.bota),
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        largo = excluded.largo,
        cintura = excluded.cintura,
        base = excluded.base,
        tiro = excluded.tiro,
        pierna = excluded.pierna,
        rodilla = excluded.rodilla,
        bota = excluded.bota,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        sync_status = excluded.sync_status;
      `,
      pantalonMeasurement.id,
      pantalonMeasurement.clientId,
      pantalonMeasurement.largo,
      pantalonMeasurement.cintura,
      pantalonMeasurement.base,
      pantalonMeasurement.tiro,
      pantalonMeasurement.pierna,
      pantalonMeasurement.rodilla,
      pantalonMeasurement.bota,
      pantalonMeasurement.notes,
      pantalonMeasurement.createdAt,
      pantalonMeasurement.updatedAt,
      pantalonMeasurement.syncStatus,
    );

    this.notifyWriteCommitted();

    return pantalonMeasurement;
  }

  async findCamisaByClientId(
    clientId: string,
  ): Promise<CamisaMeasurement | null> {
    const row = await this.findCamisaRowByClientId(clientId);
    if (!row) {
      return null;
    }

    return mapCamisaRow(row);
  }

  async findPantalonByClientId(
    clientId: string,
  ): Promise<PantalonMeasurement | null> {
    const row = await this.findPantalonRowByClientId(clientId);
    if (!row) {
      return null;
    }

    return mapPantalonRow(row);
  }

  private async findCamisaRowByClientId(
    clientId: string,
  ): Promise<CamisaMeasurementRow | null> {
    const db = getDatabase();
    return db.getFirstAsync<CamisaMeasurementRow>(
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
        notes,
        created_at,
        updated_at,
        sync_status
      FROM camisa_measurements
      WHERE client_id = ?
      LIMIT 1;
      `,
      clientId,
    );
  }

  private async findPantalonRowByClientId(
    clientId: string,
  ): Promise<PantalonMeasurementRow | null> {
    const db = getDatabase();
    return db.getFirstAsync<PantalonMeasurementRow>(
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
      WHERE client_id = ?
      LIMIT 1;
      `,
      clientId,
    );
  }

  private notifyWriteCommitted(): void {
    if (!this.options.onWriteCommitted) {
      return;
    }

    // Sync trigger must never block or fail local writes.
    void Promise.resolve(this.options.onWriteCommitted()).catch(
      () => undefined,
    );
  }
}
