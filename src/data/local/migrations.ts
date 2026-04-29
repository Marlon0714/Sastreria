import type { SQLiteDatabase } from "expo-sqlite";

interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

const TARGET_SCHEMA_VERSION = 1;

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

      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}
