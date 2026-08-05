import type { SQLiteDatabase } from "expo-sqlite";

interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

const TARGET_SCHEMA_VERSION = 21;

const MIGRATIONS: readonly Migration[] = [
  {
    version: 12,
    name: "v12_talla_templates",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS talla_templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('camisa', 'pantalon', 'saco', 'chaleco')),
        espalda REAL,
        hombro REAL,
        talle_delantero REAL,
        talle_trasero REAL,
        distancia REAL,
        separacion REAL,
        pecho REAL,
        cintura REAL,
        base REAL,
        largo REAL,
        largo_manga REAL,
        ancho_manga REAL,
        escote REAL,
        cuello REAL,
        brazo REAL,
        puno REAL,
        tiro REAL,
        pierna REAL,
        rodilla REAL,
        bota REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
      `,
    ],
  },
  {
    version: 11,
    name: "v11_saco_extra_fields",
    statements: [
      `ALTER TABLE saco_measurements ADD COLUMN hombro REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN talle_delantero REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN distancia REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN separacion REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN largo_manga REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN ancho_manga REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN cuello REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN brazo REAL;`,
      `ALTER TABLE saco_measurements ADD COLUMN puno REAL;`,
    ],
  },
  {
    version: 10,
    name: "v10_client_tallas",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS client_tallas (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('camisa', 'pantalon', 'saco', 'chaleco')),
        value TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        UNIQUE(client_id, type),
        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
      );
      `,
      `CREATE INDEX IF NOT EXISTS idx_client_tallas_client_id
       ON client_tallas (client_id);`,
    ],
  },
  {
    version: 9,
    name: "v9_client_phones_cedula_saco_chaleco_measurements",
    statements: [
      // Agregar campos phones y cedula a clients
      `ALTER TABLE clients ADD COLUMN phones TEXT;`,
      `ALTER TABLE clients ADD COLUMN cedula TEXT;`,

      // Crear tabla saco_measurements
      `
        CREATE TABLE IF NOT EXISTS saco_measurements (
          id TEXT PRIMARY KEY NOT NULL,
          client_id TEXT NOT NULL,
          espalda REAL,
          talle_trasero REAL,
          largo REAL,
          pecho REAL,
          cintura REAL,
          base REAL,
          escote REAL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
          UNIQUE(client_id),
          FOREIGN KEY (client_id) REFERENCES clients (id)
        );
        `,

      // Crear tabla chaleco_measurements
      `
        CREATE TABLE IF NOT EXISTS chaleco_measurements (
          id TEXT PRIMARY KEY NOT NULL,
          client_id TEXT NOT NULL,
          espalda REAL,
          talle_trasero REAL,
          largo REAL,
          pecho REAL,
          cintura REAL,
          base REAL,
          escote REAL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
          UNIQUE(client_id),
          FOREIGN KEY (client_id) REFERENCES clients (id)
        );
        `,

      // Nota: cuello/brazo/puno fueron añadidos en v3; rodilla/bota están en
      // el CREATE TABLE de v2. No se repiten aquí para evitar errores en upgrades.
    ],
  },
  {
    version: 1,
    name: "v1_initial_schema",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS measurements (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        measured_at TEXT NOT NULL,
        pecho_cm REAL NOT NULL,
        cintura_cm REAL NOT NULL,
        base_cm REAL NOT NULL,
        largo_cm REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_measurements_client_id_measured_at
      ON measurements (client_id, measured_at DESC);
      `,
    ],
  },
  {
    version: 2,
    name: "v2_measurements_by_garment",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS camisa_measurements (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        espalda REAL,
        hombro REAL,
        talle_delantero REAL,
        talle_trasero REAL,
        distancia REAL,
        separacion REAL,
        pecho REAL,
        cintura REAL,
        base REAL,
        largo REAL,
        largo_manga REAL,
        ancho_manga REAL,
        escote REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        UNIQUE(client_id),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS pantalon_measurements (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        largo REAL,
        cintura REAL,
        base REAL,
        tiro REAL,
        pierna REAL,
        rodilla REAL,
        bota REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        UNIQUE(client_id),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      `,
    ],
  },
  {
    version: 3,
    name: "v3_camisa_extra_measurements",
    statements: [
      `ALTER TABLE camisa_measurements ADD COLUMN cuello REAL;`,
      `ALTER TABLE camisa_measurements ADD COLUMN brazo REAL;`,
      `ALTER TABLE camisa_measurements ADD COLUMN puno REAL;`,
    ],
  },
  {
    version: 4,
    name: "v4_sync_delete_log",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS sync_delete_log (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_sync_delete_log_status_deleted_at
      ON sync_delete_log (sync_status, deleted_at ASC);
      `,
    ],
  },
  {
    version: 5,
    name: "v5_sync_checkpoints",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        scope TEXT PRIMARY KEY NOT NULL,
        cursor_updated_at TEXT,
        cursor_id TEXT,
        updated_at TEXT NOT NULL
      );
      `,
    ],
  },
  {
    version: 6,
    name: "v6_measurements_audit_trail",
    statements: [
      `ALTER TABLE camisa_measurements ADD COLUMN changed_by TEXT;`,
      `ALTER TABLE camisa_measurements ADD COLUMN changed_at TEXT;`,
      `ALTER TABLE pantalon_measurements ADD COLUMN changed_by TEXT;`,
      `ALTER TABLE pantalon_measurements ADD COLUMN changed_at TEXT;`,
    ],
  },
  {
    version: 7,
    name: "v7_drop_obsolete_measurements_table",
    // The generic `measurements` table was superseded by `camisa_measurements`
    // and `pantalon_measurements` in v2. Drop it to remove dead schema.
    statements: [`DROP TABLE IF EXISTS measurements;`],
  },
  {
    version: 8,
    name: "v8_pricing_services",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS pricing_services (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
      `,
      `CREATE INDEX IF NOT EXISTS idx_pricing_services_name ON pricing_services (name);`,
    ],
  },
  {
    version: 13,
    name: "v13_pricing_services_category",
    statements: [
      `ALTER TABLE pricing_services ADD COLUMN category TEXT NOT NULL DEFAULT 'arreglo' CHECK (category IN ('arreglo', 'confeccion'));`,
    ],
  },
  {
    version: 14,
    name: "v14_schedules",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        client_id TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      `,
      `CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date);`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_client_id ON schedules (client_id);`,
    ],
  },
  {
    // Bloque 1 (N-076): date/time pasan a opcionales y status cambia de
    // valores placeholder a los 5 estados de negocio reales. SQLite no
    // permite quitar NOT NULL ni cambiar un CHECK con ALTER TABLE — primera
    // vez en el proyecto que se usa el patrón "recrear tabla" (crear nueva,
    // copiar datos con mapeo defensivo de valores viejos, dropear vieja,
    // renombrar). Ver SUPABASE_MIGRATIONS.md v19 para el equivalente en Postgres.
    version: 19,
    name: "v19_schedule_redesign",
    statements: [
      `
      CREATE TABLE schedules_new (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        date TEXT,
        time TEXT,
        price REAL,
        operario_id TEXT,
        notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('pendiente', 'agendado', 'en_proceso', 'listo_para_entregar', 'entregado')),
        ready_at TEXT,
        delivered_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      `,
      `
      INSERT INTO schedules_new (id, client_id, date, time, status, notes, created_at, updated_at, sync_status)
      SELECT id, client_id, date, time,
        CASE status
          WHEN 'pending' THEN 'pendiente'
          WHEN 'confirmed' THEN 'agendado'
          WHEN 'completed' THEN 'entregado'
          WHEN 'cancelled' THEN 'pendiente'
          ELSE 'pendiente'
        END,
        notes, created_at, updated_at, sync_status
      FROM schedules;
      `,
      `DROP TABLE schedules;`,
      `ALTER TABLE schedules_new RENAME TO schedules;`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date);`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_client_id ON schedules (client_id);`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_operario_id ON schedules (operario_id);`,
      `
      CREATE TABLE IF NOT EXISTS schedule_events (
        id TEXT PRIMARY KEY NOT NULL,
        schedule_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_display_name TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_auto', 'status_manual', 'status_manual_correction', 'deleted')),
        changes TEXT,
        identity_verified INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
      `,
      `CREATE INDEX IF NOT EXISTS idx_schedule_events_schedule_id ON schedule_events (schedule_id);`,
    ],
  },
  {
    // Bloque 1 Fase 4 (N-077): espejo local de solo lectura de `profiles`
    // (Supabase), para que el picker de "operario asignado" funcione sin
    // internet. Pull-only — la app nunca crea/edita perfiles, así que no
    // pasa por el motor de sync de push (sin fila en sync_delete_log, sin
    // SyncEntityType propio). Nunca incluye pin_hash (ni siquiera se
    // selecciona desde Supabase, ver SupabasePullSync.pullProfilesIncremental).
    version: 20,
    name: "v20_profiles_cache",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS profiles_cache (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'operario')),
        is_shared_device INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      `,
      `CREATE INDEX IF NOT EXISTS idx_profiles_cache_is_shared_device ON profiles_cache (is_shared_device);`,
    ],
  },
  {
    // Feedback de uso real (2026-08-04): corregir manualmente el status a
    // "pendiente"/"agendado"/"en_proceso" no se quedaba — el siguiente
    // update() de cualquier campo volvía a derivar el status automáticamente
    // (ej. si el operario seguía asignado, volvía a "en_proceso" solo por
    // eso). `status_locked` marca que el status actual viene de una
    // corrección manual explícita, para que update() deje de re-derivarlo
    // hasta la próxima acción explícita (markReady/markDelivered/otra
    // corrección). `is_priority` es un campo nuevo del usuario: marca un
    // turno ya agendado (con fecha) como más urgente que el resto del día.
    version: 21,
    name: "v21_schedule_status_lock_and_priority",
    statements: [
      `ALTER TABLE schedules ADD COLUMN status_locked INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE schedules ADD COLUMN is_priority INTEGER NOT NULL DEFAULT 0;`,
    ],
  },
  {
    // Pedido del dueño (2026-08-05): separar la Agenda de arreglos de una
    // agenda de confecciones, con el mismo patrón de segmentado que ya usa
    // Precios (un solo turno, categorizado, no una entidad/tabla aparte).
    // Todos los turnos existentes quedan como 'arreglo' por defecto.
    version: 22,
    name: "v22_schedule_category",
    statements: [
      `ALTER TABLE schedules ADD COLUMN category TEXT NOT NULL DEFAULT 'arreglo';`,
    ],
  },
];

interface UserVersionRow {
  user_version: number;
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<UserVersionRow>(
    "PRAGMA user_version;",
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= TARGET_SCHEMA_VERSION) {
    return;
  }

  const sortedMigrations = [...MIGRATIONS].sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of sortedMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async (): Promise<void> => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }

      await db.runAsync(
        `
        INSERT OR REPLACE INTO schema_migrations (version, name, applied_at)
        VALUES (?, ?, ?);
        `,
        migration.version,
        migration.name,
        new Date().toISOString(),
      );

      // PRAGMA user_version does not support ? binding in expo-sqlite;
      // migration.version is a compile-time const integer — safe to interpolate.
      const safeVersion = Number(migration.version);
      await db.execAsync(`PRAGMA user_version = ${safeVersion};`);
    });
  }
}
