import { getDatabase } from "../local/database";
import { getSupabaseClient } from "../supabase/client";

import {
  SyncCheckpointRepository,
  type SyncCheckpointRepositoryPort,
} from "./SyncCheckpointRepository";
import type { SyncCursor } from "./types";

type DeleteEntityType =
  | "client"
  | "camisa_measurement"
  | "pantalon_measurement";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CamisaRow {
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
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PantalonRow {
  id: string;
  client_id: string;
  largo: number | null;
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
}

interface DeleteLogRow {
  id: string;
  entity_type: DeleteEntityType;
  entity_id: string;
  deleted_at: string;
}

function createCursor(id: string, updatedAt: string): SyncCursor {
  return { id, updatedAt };
}

function getLastCursor<T extends { id: string }>(
  rows: readonly T[],
  timestampAccessor: (row: T) => string,
): SyncCursor | null {
  const last = rows[rows.length - 1];
  if (!last) {
    return null;
  }

  return createCursor(last.id, timestampAccessor(last));
}

export class SupabasePullSync {
  constructor(
    private readonly checkpointRepository: SyncCheckpointRepositoryPort = new SyncCheckpointRepository(),
    private readonly batchSize: number = 250,
  ) {}

  async pullAll(): Promise<void> {
    await this.pullIncremental();
  }

  async pullIncremental(): Promise<void> {
    await this.pullClientsIncremental();
    await this.pullCamisaMeasurementsIncremental();
    await this.pullPantalonMeasurementsIncremental();
    await this.pullDeleteLogIncremental();
  }

  private async pullClientsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("clients");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("clients")
      .select("id, first_name, last_name, phone, notes, created_at, updated_at")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(`[pull] clients incremental fetch failed: ${error.code}`);
    }

    const rows = (data ?? []) as ClientRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO clients
            (id, first_name, last_name, phone, notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            first_name  = excluded.first_name,
            last_name   = excluded.last_name,
            phone       = excluded.phone,
            notes       = excluded.notes,
            updated_at  = excluded.updated_at,
            sync_status = 'synced'
          WHERE excluded.updated_at >= clients.updated_at;
          `,
          row.id,
          row.first_name,
          row.last_name,
          row.phone,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor("clients", nextCursor);
    }
  }

  private async pullCamisaMeasurementsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "camisa_measurements",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("camisa_measurements")
      .select(
        "id, client_id, espalda, hombro, talle_delantero, talle_trasero, " +
          "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
          "ancho_manga, escote, cuello, brazo, puno, changed_by, changed_at, notes, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(`[pull] camisa incremental fetch failed: ${error.code}`);
    }

    const rows = (data ?? []) as unknown as CamisaRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO camisa_measurements
            (id, client_id, espalda, hombro, talle_delantero, talle_trasero,
             distancia, separacion, pecho, cintura, base, largo, largo_manga,
             ancho_manga, escote, cuello, brazo, puno, changed_by, changed_at, notes, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            espalda         = excluded.espalda,
            hombro          = excluded.hombro,
            talle_delantero = excluded.talle_delantero,
            talle_trasero   = excluded.talle_trasero,
            distancia       = excluded.distancia,
            separacion      = excluded.separacion,
            pecho           = excluded.pecho,
            cintura         = excluded.cintura,
            base            = excluded.base,
            largo           = excluded.largo,
            largo_manga     = excluded.largo_manga,
            ancho_manga     = excluded.ancho_manga,
            escote          = excluded.escote,
            cuello          = excluded.cuello,
            brazo           = excluded.brazo,
            puno            = excluded.puno,
            changed_by      = excluded.changed_by,
            changed_at      = excluded.changed_at,
            notes           = excluded.notes,
            updated_at      = excluded.updated_at,
            sync_status     = 'synced'
          WHERE excluded.updated_at >= camisa_measurements.updated_at;
          `,
          row.id,
          row.client_id,
          row.espalda ?? null,
          row.hombro ?? null,
          row.talle_delantero ?? null,
          row.talle_trasero ?? null,
          row.distancia ?? null,
          row.separacion ?? null,
          row.pecho ?? null,
          row.cintura ?? null,
          row.base ?? null,
          row.largo ?? null,
          row.largo_manga ?? null,
          row.ancho_manga ?? null,
          row.escote ?? null,
          row.cuello ?? null,
          row.brazo ?? null,
          row.puno ?? null,
          row.changed_by ?? null,
          row.changed_at ?? null,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "camisa_measurements",
        nextCursor,
      );
    }
  }

  private async pullPantalonMeasurementsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "pantalon_measurements",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("pantalon_measurements")
      .select(
        "id, client_id, largo, cintura, base, tiro, pierna, rodilla, bota, " +
          "changed_by, changed_at, notes, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] pantalon incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as PantalonRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO pantalon_measurements
            (id, client_id, largo, cintura, base, tiro, pierna, rodilla, bota,
             changed_by, changed_at, notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            largo       = excluded.largo,
            cintura     = excluded.cintura,
            base        = excluded.base,
            tiro        = excluded.tiro,
            pierna      = excluded.pierna,
            rodilla     = excluded.rodilla,
            bota        = excluded.bota,
            changed_by  = excluded.changed_by,
            changed_at  = excluded.changed_at,
            notes       = excluded.notes,
            updated_at  = excluded.updated_at,
            sync_status = 'synced'
          WHERE excluded.updated_at >= pantalon_measurements.updated_at;
          `,
          row.id,
          row.client_id,
          row.largo ?? null,
          row.cintura ?? null,
          row.base ?? null,
          row.tiro ?? null,
          row.pierna ?? null,
          row.rodilla ?? null,
          row.bota ?? null,
          row.changed_by ?? null,
          row.changed_at ?? null,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "pantalon_measurements",
        nextCursor,
      );
    }
  }

  private async pullDeleteLogIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("sync_delete_log");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("sync_delete_log")
      .select("id, entity_type, entity_id, deleted_at")
      .order("deleted_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "deleted_at");

    const { data, error } = await query;
    if (error) {
      throw new Error(
        `[pull] delete log incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as DeleteLogRow[];
    if (!rows.length) {
      return;
    }

    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        if (row.entity_type === "client") {
          await db.runAsync(
            `DELETE FROM camisa_measurements WHERE client_id = ?;`,
            row.entity_id,
          );
          await db.runAsync(
            `DELETE FROM pantalon_measurements WHERE client_id = ?;`,
            row.entity_id,
          );
          await db.runAsync(`DELETE FROM clients WHERE id = ?;`, row.entity_id);
        }

        if (row.entity_type === "camisa_measurement") {
          await db.runAsync(
            `DELETE FROM camisa_measurements WHERE id = ?;`,
            row.entity_id,
          );
        }

        if (row.entity_type === "pantalon_measurement") {
          await db.runAsync(
            `DELETE FROM pantalon_measurements WHERE id = ?;`,
            row.entity_id,
          );
        }

        await db.runAsync(
          `
          UPDATE sync_delete_log
          SET sync_status = 'synced'
          WHERE id = ?;
          `,
          row.id,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.deleted_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "sync_delete_log",
        nextCursor,
      );
    }
  }

  private applyCursorFilter<TQuery>(
    query: TQuery,
    cursor: SyncCursor | null,
    timestampColumn: "updated_at" | "deleted_at",
  ): TQuery {
    if (!cursor) {
      return query;
    }

    const queryWithFilter = query as TQuery & {
      or: (filter: string) => TQuery;
    };

    // Validate cursor values to prevent PostgREST filter injection from
    // untrusted server-side data stored in sync_checkpoints.
    const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!ISO_TIMESTAMP_RE.test(cursor.updatedAt) || !UUID_RE.test(cursor.id)) {
      throw new Error("[sync] invalid cursor values, aborting pull");
    }

    return queryWithFilter.or(
      `${timestampColumn}.gt.${cursor.updatedAt},and(${timestampColumn}.eq.${cursor.updatedAt},id.gt.${cursor.id})`,
    );
  }
}
