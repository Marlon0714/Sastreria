import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "sastreria.db";

let databaseInstance: SQLiteDatabase | null = null;

/**
 * expo-sqlite no serializa por sí solo llamadas concurrentes a
 * withTransactionAsync: si dos se disparan a la vez sobre la misma conexión
 * (ej. un pull de sync en segundo plano mientras el usuario guarda un cambio
 * local, o dos triggers de sync casi simultáneos), sus BEGIN/COMMIT/ROLLBACK
 * pueden intercalarse y terminar en errores nativos como "cannot rollback -
 * no transaction is active". Esta cola global asegura que solo haya una
 * transacción abierta a la vez en toda la app, sin importar quién la pida.
 */
function serializeTransactions(db: SQLiteDatabase): SQLiteDatabase {
  const originalWithTransactionAsync = db.withTransactionAsync.bind(db);
  let queue: Promise<void> = Promise.resolve();

  db.withTransactionAsync = (task: () => Promise<void>): Promise<void> => {
    const run = (): Promise<void> => originalWithTransactionAsync(task);
    const result = queue.then(run, run);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return db;
}

export function getDatabase(): SQLiteDatabase {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = serializeTransactions(openDatabaseSync(DATABASE_NAME));
  return databaseInstance;
}

/** Reset singleton — usado solo en tests. */
export function _resetDatabase(): void {
  databaseInstance = null;
}
