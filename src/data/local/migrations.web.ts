type WebDatabaseLike = {
  execAsync?: (sql: string) => Promise<void>;
};

export async function runMigrations(_db: WebDatabaseLike): Promise<void> {
  // Web dev mode uses in-memory adapter; schema migrations are no-op here.
  return;
}
