import { getDatabase } from "../local/database";
import { getSupabaseClient } from "../supabase/client";

/**
 * Downloads all clients and measurements from Supabase and upserts them
 * into the local SQLite database.  Called once after a successful login
 * so a second device immediately sees data created on the first device.
 *
 * All records are stored with sync_status = 'synced' since they already
 * exist in the remote source of truth.
 *
 * Errors are thrown with sanitized messages (no PII in logs).
 */
export class SupabasePullSync {
  async pullAll(): Promise<void> {
    await this.pullClients();
    await this.pullCamisaMeasurements();
    await this.pullPantalonMeasurements();
  }

  private async pullClients(): Promise<void> {
    const supabase = getSupabaseClient();
    const db = getDatabase();

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, first_name, last_name, phone, notes, created_at, updated_at",
      );

    if (error) {
      throw new Error(`[pull] clients fetch failed: ${error.code}`);
    }
    if (!data || !Array.isArray(data) || data.length === 0) return;
    type ClientRow = {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    };
    for (const rowUntyped of data) {
      if (
        !rowUntyped ||
        typeof rowUntyped !== "object" ||
        !("id" in rowUntyped)
      )
        continue;
      const row = rowUntyped as ClientRow;
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
  }

  private async pullCamisaMeasurements(): Promise<void> {
    const supabase = getSupabaseClient();
    const db = getDatabase();

    const { data, error } = await supabase
      .from("camisa_measurements")
      .select(
        "id, client_id, espalda, hombro, talle_delantero, talle_trasero, " +
          "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
          "ancho_manga, escote, cuello, brazo, puno, notes, created_at, updated_at",
      );

    if (error) {
      throw new Error(`[pull] camisa fetch failed: ${error.code}`);
    }
    if (!data || !Array.isArray(data) || data.length === 0) return;
    type CamisaRow = {
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
    };
    for (const rowUntyped of data) {
      if (
        !rowUntyped ||
        typeof rowUntyped !== "object" ||
        !("id" in rowUntyped)
      )
        continue;
      const row = rowUntyped as CamisaRow;
      await db.runAsync(
        `
        INSERT INTO camisa_measurements
          (id, client_id, espalda, hombro, talle_delantero, talle_trasero,
           distancia, separacion, pecho, cintura, base, largo, largo_manga,
           ancho_manga, escote, cuello, brazo, puno, notes, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
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
        row.notes ?? null,
        row.created_at,
        row.updated_at,
      );
    }
  }

  private async pullPantalonMeasurements(): Promise<void> {
    const supabase = getSupabaseClient();
    const db = getDatabase();

    const { data, error } = await supabase
      .from("pantalon_measurements")
      .select(
        "id, client_id, largo, cintura, base, tiro, pierna, rodilla, bota, " +
          "notes, created_at, updated_at",
      );

    if (error) {
      throw new Error(`[pull] pantalon fetch failed: ${error.code}`);
    }
    if (!data || !Array.isArray(data) || data.length === 0) return;
    type PantalonRow = {
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
    };
    for (const rowUntyped of data) {
      if (
        !rowUntyped ||
        typeof rowUntyped !== "object" ||
        !("id" in rowUntyped)
      )
        continue;
      const row = rowUntyped as PantalonRow;
      await db.runAsync(
        `
        INSERT INTO pantalon_measurements
          (id, client_id, largo, cintura, base, tiro, pierna, rodilla, bota,
           notes, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          largo       = excluded.largo,
          cintura     = excluded.cintura,
          base        = excluded.base,
          tiro        = excluded.tiro,
          pierna      = excluded.pierna,
          rodilla     = excluded.rodilla,
          bota        = excluded.bota,
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
        row.notes ?? null,
        row.created_at,
        row.updated_at,
      );
    }
  }
}
