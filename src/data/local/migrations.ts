import type { SQLiteDatabase } from "expo-sqlite";

interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

const TARGET_SCHEMA_VERSION = 5;

const MIGRATIONS: readonly Migration[] = [
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
        cadera_cm REAL NOT NULL,
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

  for (const migration of MIGRATIONS) {
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
