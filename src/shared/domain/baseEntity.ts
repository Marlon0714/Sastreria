export type SyncStatus = "pending" | "synced" | "error";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}
