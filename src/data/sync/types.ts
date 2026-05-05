import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";
import type { SyncStatus } from "../../shared/domain/baseEntity";

export type SyncEntityType =
  | "client"
  | "camisa_measurement"
  | "pantalon_measurement"
  | "delete_log";

export type SyncOperationType = "upsert" | "delete";

export type SyncCheckpointScope =
  | "clients"
  | "camisa_measurements"
  | "pantalon_measurements"
  | "sync_delete_log";

export interface SyncCursor {
  updatedAt: string;
  id: string;
}

export interface SyncDeleteLogEntry {
  id: string;
  entityType: Exclude<SyncEntityType, "delete_log">;
  entityId: string;
  deletedAt: string;
  syncStatus: SyncStatus;
}

export interface SyncCheckpoint {
  scope: SyncCheckpointScope;
  cursor: SyncCursor | null;
  updatedAt: string;
}

export type SyncTriggerSource =
  | "write"
  | "realtime"
  | "foreground"
  | "bootstrap"
  | "manual";

interface SyncQueueItemBase {
  entityType: SyncEntityType;
  id: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  operationType: SyncOperationType;
}

export interface SyncClientQueueItem extends SyncQueueItemBase {
  entityType: "client";
  payload: Client;
}

export interface SyncCamisaQueueItem extends SyncQueueItemBase {
  entityType: "camisa_measurement";
  payload: CamisaMeasurement;
}

export interface SyncPantalonQueueItem extends SyncQueueItemBase {
  entityType: "pantalon_measurement";
  payload: PantalonMeasurement;
}

export interface SyncDeleteQueueItem extends SyncQueueItemBase {
  entityType: "delete_log";
  operationType: "delete";
  payload: SyncDeleteLogEntry;
}

export type SyncQueueItem =
  | SyncClientQueueItem
  | SyncCamisaQueueItem
  | SyncPantalonQueueItem
  | SyncDeleteQueueItem;

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  batchSize: number;
}

export interface SyncRunResult {
  processed: number;
  synced: number;
  failed: number;
}
