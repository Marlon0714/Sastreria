/**
 * Estado de sincronización local de una entidad.
 * - "pending": pendiente de sincronizar con cloud.
 * - "synced": solo puede ser asignado si outcome=cloud-ok (nunca en local-only/offline).
 * - "error": falló la sincronización, requiere retry.
 *
 * REGLA: Nunca marcar como "synced" si el outcome es "deferred_local_only" o "deferred_offline".
 */
export type SyncStatus = "pending" | "synced" | "error";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}
