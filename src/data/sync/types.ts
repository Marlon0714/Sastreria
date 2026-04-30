import type { Client, Measurement } from "../../features/clients/domain/types";
import type { SyncStatus } from "../../shared/domain/baseEntity";

export type SyncEntityType = "client" | "measurement";

interface SyncQueueItemBase {
  entityType: SyncEntityType;
  id: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface SyncClientQueueItem extends SyncQueueItemBase {
  entityType: "client";
  payload: Client;
}

export interface SyncMeasurementQueueItem extends SyncQueueItemBase {
  entityType: "measurement";
  payload: Measurement;
}

export type SyncQueueItem = SyncClientQueueItem | SyncMeasurementQueueItem;

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
