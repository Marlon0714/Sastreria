import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";
import type { SyncStatus } from "../../shared/domain/baseEntity";

export type SyncEntityType =
  | "client"
  | "camisa_measurement"
  | "pantalon_measurement";

interface SyncQueueItemBase {
  entityType: SyncEntityType;
  id: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  operationType: "upsert" | "delete";
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

export type SyncQueueItem =
  | SyncClientQueueItem
  | SyncCamisaQueueItem
  | SyncPantalonQueueItem;

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
