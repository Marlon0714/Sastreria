import type { SQLiteDatabase } from "expo-sqlite";

import { notifyWriteCommitted, type WriteCommittedOptions } from "../writeCommitted";

import { generateDomainUuid } from "../../../features/clients/domain/types";
import type { SyncEntityType } from "../../sync/types";

export type SyncStatus = "pending" | "synced" | "error";

export type MeasurementTable =
  | "camisa_measurements"
  | "pantalon_measurements"
  | "saco_measurements"
  | "chaleco_measurements";

export function normalizeNullableNumber(
  value: number | null | undefined,
): number | null {
  return value ?? null;
}

export function normalizeNullableNotes(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeNullableChangedBy(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Borra la medida (una sola por cliente y tipo, UNIQUE por client_id) y
 * registra la entrada en `sync_delete_log` que dispara el DELETE en
 * Supabase (ver `executeCloudDelete` en SupabaseSyncTransport.ts, que ya
 * tiene rama para los 4 tipos de medida). El SELECT del id y el DELETE
 * corren dentro de la MISMA transacción (mismo patrón que
 * `PricingServiceRepositoryImpl.update()`), para que ninguna otra
 * escritura (ej. un pull de sync) se intercale entre ambos.
 *
 * Si el cliente no tiene esa medida guardada, es un no-op idempotente: no
 * se escribe nada y no se notifica el commit, para no disparar un ciclo de
 * sync sin ningún cambio real que sincronizar.
 */
export async function deleteMeasurementByClientId(
  db: SQLiteDatabase,
  table: MeasurementTable,
  entityType: SyncEntityType,
  clientId: string,
  options: WriteCommittedOptions,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const deleteLogId = generateDomainUuid();
  let hadMeasurement = false;

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM ${table} WHERE client_id = ? LIMIT 1;`,
      clientId,
    );

    if (!existing) {
      return;
    }

    hadMeasurement = true;

    await db.runAsync(`DELETE FROM ${table} WHERE client_id = ?;`, clientId);
    await db.runAsync(
      `
      INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
      VALUES (?, ?, ?, ?, ?);
      `,
      deleteLogId,
      entityType,
      existing.id,
      nowIso,
      "pending",
    );
  });

  if (hadMeasurement) {
    notifyWriteCommitted(options);
  }
}
