import { getDatabase } from "./database";

import type { MeasurementRepository } from "../../features/clients/domain/repository";
import {
  generateDomainUuid,
  type AddMeasurementDTO,
  type Measurement,
} from "../../features/clients/domain/types";

interface MeasurementRow {
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

function mapMeasurementRow(row: MeasurementRow): Measurement {
  return {
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
  };
}

export class MeasurementRepositoryImpl implements MeasurementRepository {
  async addMeasurement(input: AddMeasurementDTO): Promise<Measurement> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    const measurement: Measurement = {
      id: generateDomainUuid(),
      clientId: input.clientId,
      measuredAt: input.measuredAt ?? nowIso,
      pechoCm: input.pechoCm,
      cinturaCm: input.cinturaCm,
      caderaCm: input.caderaCm,
      largoCm: input.largoCm,
      notes: input.notes?.trim() ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: "pending",
    };

    await db.runAsync(
      `
      INSERT INTO measurements (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      measurement.id,
      measurement.clientId,
      measurement.measuredAt,
      measurement.pechoCm,
      measurement.cinturaCm,
      measurement.caderaCm,
      measurement.largoCm,
      measurement.notes,
      measurement.createdAt,
      measurement.updatedAt,
      measurement.syncStatus,
    );

    return measurement;
  }

  async findMeasurementsByClientId(clientId: string): Promise<Measurement[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MeasurementRow>(
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
      WHERE client_id = ?
      ORDER BY measured_at DESC;
      `,
      clientId,
    );

    return rows.map(mapMeasurementRow);
  }
}
