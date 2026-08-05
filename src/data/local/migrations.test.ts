import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { SQLiteDatabase } from "expo-sqlite";

import { MIGRATIONS, runMigrations } from "./migrations";

function sortedVersions(): number[] {
  return [...MIGRATIONS].map((m) => m.version).sort((a, b) => a - b);
}

function highestVersion(): number {
  const versions = sortedVersions();
  return versions[versions.length - 1]!;
}

function buildMockDb(currentVersion: number) {
  const execAsync = jest.fn<(sql: string) => Promise<unknown>>(
    async () => undefined,
  );
  const runAsync = jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>(
    async () => undefined,
  );
  const withTransactionAsync = jest.fn<
    (callback: () => Promise<void>) => Promise<void>
  >(async (callback) => {
    await callback();
  });
  const getFirstAsync = jest.fn<() => Promise<{ user_version: number }>>(
    async () => ({ user_version: currentVersion }),
  );

  const db = {
    execAsync,
    runAsync,
    withTransactionAsync,
    getFirstAsync,
  } as unknown as SQLiteDatabase;

  return { db, execAsync, runAsync, withTransactionAsync, getFirstAsync };
}

describe("runMigrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("no aplica nada si currentVersion ya es la más alta declarada", async () => {
    const { db, execAsync, withTransactionAsync } = buildMockDb(
      highestVersion(),
    );

    await runMigrations(db);

    expect(withTransactionAsync).not.toHaveBeenCalled();
    expect(execAsync).not.toHaveBeenCalled();
  });

  it("aplica la migración más alta declarada aunque currentVersion sea la anterior", async () => {
    // Regresión: hasta 2026-08-05 existía una constante TARGET_SCHEMA_VERSION
    // separada de MIGRATIONS que había que subir a mano con cada migración
    // nueva. Se olvidó al agregar v22, así que un dispositivo en la versión
    // anterior nunca llegaba a aplicar v22 — runMigrations() retornaba de
    // inmediato. Esta prueba usa MIGRATIONS real (no una versión fija a
    // mano) para que si el mismo tipo de bug vuelve a pasar, falle sola.
    const versions = sortedVersions();
    const highest = versions[versions.length - 1]!;
    const secondHighest = versions[versions.length - 2]!;
    const highestMigration = MIGRATIONS.find((m) => m.version === highest)!;

    const { db, execAsync, runAsync } = buildMockDb(secondHighest);

    await runMigrations(db);

    for (const statement of highestMigration.statements) {
      expect(execAsync).toHaveBeenCalledWith(statement);
    }
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO schema_migrations"),
      highest,
      highestMigration.name,
      expect.any(String),
    );
    expect(execAsync).toHaveBeenCalledWith(
      `PRAGMA user_version = ${highest};`,
    );
  });

  it("aplica todas las migraciones pendientes en orden ascendente de versión, desde cero", async () => {
    const { db, withTransactionAsync } = buildMockDb(0);

    await runMigrations(db);

    expect(withTransactionAsync).toHaveBeenCalledTimes(MIGRATIONS.length);
  });

  it("no reaplica una migración cuya versión ya está registrada", async () => {
    const versions = sortedVersions();
    const lowest = versions[0]!;
    const { db, withTransactionAsync } = buildMockDb(lowest);

    await runMigrations(db);

    // Todas menos la de la versión más baja (ya "aplicada") deberían correr.
    expect(withTransactionAsync).toHaveBeenCalledTimes(MIGRATIONS.length - 1);
  });
});
