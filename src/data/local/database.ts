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

const RECOVERABLE_METHODS = [
  "execAsync",
  "runAsync",
  "withTransactionAsync",
] as const;

function isReleasedSharedObjectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("shared object that was already released")
  );
}

function openFreshDatabase(): SQLiteDatabase {
  return withReleaseRecovery(serializeTransactions(openDatabaseSync(DATABASE_NAME)));
}

/**
 * Bug conocido y sin arreglar de expo-modules-core en Android (New
 * Architecture, expo/expo#49799): el GC de la JVM puede liberar el handle
 * nativo de la conexión SQLite justo mientras una llamada async está en
 * curso, lanzando "Cannot use shared object that was already released" — no
 * es nada que hagamos mal nosotros, es la conexión nativa la que queda
 * muerta de ahí en adelante. Sin este wrapper, TODO sync futuro fallaría
 * igual hasta reiniciar la app entera (el singleton nunca se renovaba
 * solo). Se detecta ese error puntual, se abre una conexión nueva, y se
 * reintenta la MISMA llamada una sola vez sobre esa conexión nueva.
 */
function withReleaseRecovery(db: SQLiteDatabase): SQLiteDatabase {
  for (const name of RECOVERABLE_METHODS) {
    const original = db[name];
    if (typeof original !== "function") {
      continue;
    }

    const bound = original.bind(db) as (
      ...args: unknown[]
    ) => Promise<unknown>;
    // @ts-expect-error mismo patrón de reasignación que serializeTransactions
    db[name] = async (...args: unknown[]) => {
      try {
        return await bound(...args);
      } catch (error) {
        if (!isReleasedSharedObjectError(error)) {
          throw error;
        }

        databaseInstance = openFreshDatabase();
        const retry = (
          databaseInstance[name] as (...args: unknown[]) => Promise<unknown>
        ).bind(databaseInstance);
        return retry(...args);
      }
    };
  }

  return db;
}

export function getDatabase(): SQLiteDatabase {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = openFreshDatabase();
  return databaseInstance;
}

/** Reset singleton — usado solo en tests. */
export function _resetDatabase(): void {
  databaseInstance = null;
}
