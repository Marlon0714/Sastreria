type WebDatabaseLike = {
  execAsync?: (sql: string) => Promise<void>;
};

export async function runMigrations(_db: WebDatabaseLike): Promise<void> {
  // Web dev mode uses an in-memory adapter that simulates schema v2 tables,
  // so SQL migrations are intentionally a no-op in this environment.
  return;
}
