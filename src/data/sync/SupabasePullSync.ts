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
  | "pantalon_measurement"
  | "client_talla"
  | "pricing_service"
  | "schedule"
  | "talla_template";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phones: string | null;
  cedula: string | null;
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

interface TallaRow {
  id: string;
  client_id: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
  value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PricingServiceRow {
  id: string;
  name: string;
  price: number;
  category: "arreglo" | "confeccion";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SacoRow {
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
}

interface ChalecoRow {
  id: string;
  client_id: string;
  espalda: number | null;
  talle_trasero: number | null;
  largo: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  escote: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TallaTemplateRow {
  id: string;
  name: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
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
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleRow {
  id: string;
  date: string | null;
  time: string | null;
  price: number | null;
  operario_id: string | null;
  client_id: string;
  notes: string | null;
  is_priority: boolean;
  category: "arreglo" | "confeccion";
  status:
    | "pendiente"
    | "agendado"
    | "en_proceso"
    | "listo_para_entregar"
    | "entregado";
  status_locked: boolean;
  ready_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleEventRow {
  id: string;
  schedule_id: string;
  actor_id: string;
  actor_display_name: string;
  action: string;
  changes: string | null;
  identity_verified: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
  role: "owner" | "operario";
  is_shared_device: boolean;
  updated_at: string;
}

interface DeleteLogRow {
  id: string;
  entity_type: DeleteEntityType;
  entity_id: string;
  deleted_at: string;
}

function createCursor(id: string, updatedAt: string): SyncCursor {
  // Normalize to UTC ISO string (Z-terminated) regardless of DB format (+00:00, etc.)
  const normalized = new Date(updatedAt).toISOString();
  return { id, updatedAt: normalized };
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
  // Mismo patrón de coalescing que SyncOrchestrator (push): si varios
  // triggers (bootstrap, foreground, realtime, network_recovered) disparan
  // un pull casi al mismo tiempo, se unen a la corrida activa en vez de
  // arrancar otra en paralelo — dos pulls concurrentes reprocesarían el
  // mismo cursor y multiplicarían la carga de escritura sin necesidad.
  private activeRunPromise: Promise<void> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly checkpointRepository: SyncCheckpointRepositoryPort = new SyncCheckpointRepository(),
    private readonly batchSize: number = 250,
  ) {}

  async pullAll(): Promise<void> {
    await this.pullIncremental();
  }

  async pullIncremental(): Promise<void> {
    if (this.activeRunPromise) {
      this.rerunRequested = true;
      return this.activeRunPromise;
    }

    this.activeRunPromise = this.consumePullRequests();
    return this.activeRunPromise;
  }

  private async consumePullRequests(): Promise<void> {
    try {
      while (true) {
        await this.runPullOnce();

        if (!this.rerunRequested) {
          break;
        }

        this.rerunRequested = false;
      }
    } finally {
      this.activeRunPromise = null;
      this.rerunRequested = false;
    }
  }

  private async runPullOnce(): Promise<void> {
    await this.pullClientsIncremental();
    await this.pullCamisaMeasurementsIncremental();
    await this.pullPantalonMeasurementsIncremental();
    await this.pullClientTallasIncremental();
    await this.pullPricingServicesIncremental();
    await this.pullSacoMeasurementsIncremental();
    await this.pullChalecoMeasurementsIncremental();
    await this.pullTallaTemplatesIncremental();
    await this.pullSchedulesIncremental();
    await this.pullScheduleEventsIncremental();
    await this.pullProfilesIncremental();
    await this.pullDeleteLogIncremental();
  }

  private async pullClientsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("clients");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("clients")
      .select(
        "id, first_name, last_name, phone, phones, cedula, notes, created_at, updated_at",
      )
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
            (id, first_name, last_name, phone, phones, cedula, notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            first_name  = excluded.first_name,
            last_name   = excluded.last_name,
            phone       = excluded.phone,
            phones      = excluded.phones,
            cedula      = excluded.cedula,
            notes       = excluded.notes,
            updated_at  = excluded.updated_at,
            sync_status = 'synced'
          WHERE excluded.updated_at >= clients.updated_at;
          `,
          row.id,
          row.first_name,
          row.last_name,
          row.phone,
          row.phones ?? null,
          row.cedula ?? null,
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

  private async pullClientTallasIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("client_tallas");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("client_tallas")
      .select("id, client_id, type, value, notes, created_at, updated_at")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] client_tallas incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as TallaRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO client_tallas
            (id, client_id, type, value, notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            client_id   = excluded.client_id,
            type        = excluded.type,
            value       = excluded.value,
            notes       = excluded.notes,
            updated_at  = excluded.updated_at,
            sync_status = 'synced'
          WHERE excluded.updated_at >= client_tallas.updated_at;
          `,
          row.id,
          row.client_id,
          row.type,
          row.value,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "client_tallas",
        nextCursor,
      );
    }
  }

  private async pullPricingServicesIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "pricing_services",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("pricing_services")
      .select("id, name, price, category, notes, created_at, updated_at")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] pricing_services incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as PricingServiceRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO pricing_services
            (id, name, price, category, notes, createdAt, updatedAt, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            name        = excluded.name,
            price       = excluded.price,
            category    = excluded.category,
            notes       = excluded.notes,
            updatedAt   = excluded.updatedAt,
            sync_status = 'synced'
          WHERE excluded.updatedAt >= pricing_services.updatedAt;
          `,
          row.id,
          row.name,
          row.price,
          row.category,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "pricing_services",
        nextCursor,
      );
    }
  }

  private async pullSacoMeasurementsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "saco_measurements",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("saco_measurements")
      .select(
        "id, client_id, espalda, hombro, talle_delantero, talle_trasero, " +
          "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
          "ancho_manga, escote, cuello, brazo, puno, notes, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(`[pull] saco incremental fetch failed: ${error.code}`);
    }

    const rows = (data ?? []) as unknown as SacoRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO saco_measurements
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
          WHERE excluded.updated_at >= saco_measurements.updated_at;
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
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "saco_measurements",
        nextCursor,
      );
    }
  }

  private async pullChalecoMeasurementsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "chaleco_measurements",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("chaleco_measurements")
      .select(
        "id, client_id, espalda, talle_trasero, largo, pecho, cintura, base, " +
          "escote, notes, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] chaleco incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as ChalecoRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO chaleco_measurements
            (id, client_id, espalda, talle_trasero, largo, pecho, cintura, base,
             escote, notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            espalda       = excluded.espalda,
            talle_trasero = excluded.talle_trasero,
            largo         = excluded.largo,
            pecho         = excluded.pecho,
            cintura       = excluded.cintura,
            base          = excluded.base,
            escote        = excluded.escote,
            notes         = excluded.notes,
            updated_at    = excluded.updated_at,
            sync_status   = 'synced'
          WHERE excluded.updated_at >= chaleco_measurements.updated_at;
          `,
          row.id,
          row.client_id,
          row.espalda ?? null,
          row.talle_trasero ?? null,
          row.largo ?? null,
          row.pecho ?? null,
          row.cintura ?? null,
          row.base ?? null,
          row.escote ?? null,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "chaleco_measurements",
        nextCursor,
      );
    }
  }

  private async pullTallaTemplatesIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "talla_templates",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("talla_templates")
      .select(
        "id, name, type, espalda, hombro, talle_delantero, talle_trasero, " +
          "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
          "ancho_manga, escote, cuello, brazo, puno, tiro, pierna, rodilla, bota, " +
          "notes, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] talla_templates incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as TallaTemplateRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO talla_templates
            (id, name, type, espalda, hombro, talle_delantero, talle_trasero,
             distancia, separacion, pecho, cintura, base, largo, largo_manga,
             ancho_manga, escote, cuello, brazo, puno, tiro, pierna, rodilla, bota,
             notes, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            name            = excluded.name,
            type            = excluded.type,
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
            tiro            = excluded.tiro,
            pierna          = excluded.pierna,
            rodilla         = excluded.rodilla,
            bota            = excluded.bota,
            notes           = excluded.notes,
            updated_at      = excluded.updated_at,
            sync_status     = 'synced'
          WHERE excluded.updated_at >= talla_templates.updated_at;
          `,
          row.id,
          row.name,
          row.type,
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
          row.tiro ?? null,
          row.pierna ?? null,
          row.rodilla ?? null,
          row.bota ?? null,
          row.notes ?? null,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "talla_templates",
        nextCursor,
      );
    }
  }

  private async pullSchedulesIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("schedules");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("schedules")
      .select(
        "id, date, time, price, operario_id, client_id, notes, is_priority, category, status, status_locked, ready_at, delivered_at, created_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(`[pull] schedules incremental fetch failed: ${error.code}`);
    }

    const rows = (data ?? []) as unknown as ScheduleRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO schedules
            (id, date, time, price, operario_id, client_id, notes, is_priority, category, status, status_locked, ready_at, delivered_at, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            date          = excluded.date,
            time          = excluded.time,
            price         = excluded.price,
            operario_id   = excluded.operario_id,
            client_id     = excluded.client_id,
            notes         = excluded.notes,
            is_priority   = excluded.is_priority,
            category      = excluded.category,
            status        = excluded.status,
            status_locked = excluded.status_locked,
            ready_at      = excluded.ready_at,
            delivered_at  = excluded.delivered_at,
            updated_at    = excluded.updated_at,
            sync_status   = 'synced'
          WHERE excluded.updated_at >= schedules.updated_at;
          `,
          row.id,
          row.date,
          row.time,
          row.price,
          row.operario_id,
          row.client_id,
          row.notes ?? null,
          row.is_priority ? 1 : 0,
          row.category,
          row.status,
          row.status_locked ? 1 : 0,
          row.ready_at,
          row.delivered_at,
          row.created_at,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor("schedules", nextCursor);
    }
  }

  private async pullScheduleEventsIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor(
      "schedule_events",
    );
    const supabase = getSupabaseClient();
    let query = supabase
      .from("schedule_events")
      .select(
        "id, schedule_id, actor_id, actor_display_name, action, changes, identity_verified, created_at",
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    // schedule_events es append-only: no tiene updated_at propio, se usa
    // created_at como cursor (nunca cambia una vez insertado).
    query = this.applyCursorFilter(query, cursor, "created_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(
        `[pull] schedule_events incremental fetch failed: ${error.code}`,
      );
    }

    const rows = (data ?? []) as unknown as ScheduleEventRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO schedule_events
            (id, schedule_id, actor_id, actor_display_name, action, changes, identity_verified, created_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO NOTHING;
          `,
          row.id,
          row.schedule_id,
          row.actor_id,
          row.actor_display_name,
          row.action,
          row.changes ?? null,
          row.identity_verified ? 1 : 0,
          row.created_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.created_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor(
        "schedule_events",
        nextCursor,
      );
    }
  }

  /**
   * Espejo local de solo lectura de `profiles` — nunca selecciona `pin_hash`
   * (ni siquiera podría: está revocado a nivel de columna para `authenticated`,
   * ver SUPABASE_MIGRATIONS.md v18). Alimenta el picker de "operario asignado"
   * y la selección offline de identidad en useIdentityGate.
   */
  private async pullProfilesIncremental(): Promise<void> {
    const cursor = await this.checkpointRepository.getCursor("profiles");
    const supabase = getSupabaseClient();
    let query = supabase
      .from("profiles")
      .select("id, display_name, role, is_shared_device, updated_at")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(this.batchSize);

    query = this.applyCursorFilter(query, cursor, "updated_at");

    const { data, error } = await query;
    const db = getDatabase();

    if (error) {
      throw new Error(`[pull] profiles incremental fetch failed: ${error.code}`);
    }

    const rows = (data ?? []) as unknown as ProfileRow[];
    if (!rows.length) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `
          INSERT INTO profiles_cache
            (id, display_name, role, is_shared_device, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            display_name     = excluded.display_name,
            role              = excluded.role,
            is_shared_device  = excluded.is_shared_device,
            updated_at        = excluded.updated_at
          WHERE excluded.updated_at >= profiles_cache.updated_at;
          `,
          row.id,
          row.display_name,
          row.role,
          row.is_shared_device ? 1 : 0,
          row.updated_at,
        );
      }
    });

    const nextCursor = getLastCursor(rows, (row) => row.updated_at);
    if (nextCursor) {
      await this.checkpointRepository.advanceCursor("profiles", nextCursor);
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
          await db.runAsync(
            `DELETE FROM saco_measurements WHERE client_id = ?;`,
            row.entity_id,
          );
          await db.runAsync(
            `DELETE FROM chaleco_measurements WHERE client_id = ?;`,
            row.entity_id,
          );
          await db.runAsync(
            `DELETE FROM schedules WHERE client_id = ?;`,
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

        if (row.entity_type === "client_talla") {
          await db.runAsync(
            `DELETE FROM client_tallas WHERE id = ?;`,
            row.entity_id,
          );
        }

        if (row.entity_type === "pricing_service") {
          await db.runAsync(
            `DELETE FROM pricing_services WHERE id = ?;`,
            row.entity_id,
          );
        }

        if (row.entity_type === "schedule") {
          await db.runAsync(
            `DELETE FROM schedules WHERE id = ?;`,
            row.entity_id,
          );
        }

        if (row.entity_type === "talla_template") {
          await db.runAsync(
            `DELETE FROM talla_templates WHERE id = ?;`,
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
    timestampColumn: "updated_at" | "deleted_at" | "created_at",
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
