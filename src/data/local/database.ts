import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "sastreria.db";

let databaseInstance: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = openDatabaseSync(DATABASE_NAME);
  return databaseInstance;
}
