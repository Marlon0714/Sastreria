import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";
import type {
  SyncDeleteLogEntry,
  SyncTransportAttemptResult,
  SyncQueueItem,
  SyncClientQueueItem,
  SyncCamisaQueueItem,
  SyncPantalonQueueItem,
  SyncDeleteQueueItem,
} from "./types";

export interface SyncTransport {
  syncClient(client: Client): Promise<SyncTransportAttemptResult>;
  syncCamisaMeasurement(
    measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncPantalonMeasurement(
    measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncDeleteLogEntry(
    entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult>;
  syncAll(items: SyncQueueItem[]): Promise<void>;
}

export class NoopSyncTransport implements SyncTransport {
  async syncClient(_client: Client): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncCamisaMeasurement(
    _measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncPantalonMeasurement(
    _measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncDeleteLogEntry(
    _entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncAll(items: SyncQueueItem[]): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        try {
          switch (item.entityType) {
            case "client":
              await this.syncClient((item as SyncClientQueueItem).payload);
              break;
            case "camisa_measurement":
              await this.syncCamisaMeasurement(
                (item as SyncCamisaQueueItem).payload,
              );
              break;
            case "pantalon_measurement":
              await this.syncPantalonMeasurement(
                (item as SyncPantalonQueueItem).payload,
              );
              break;
            case "delete_log":
              await this.syncDeleteLogEntry(
                (item as SyncDeleteQueueItem).payload,
              );
              break;
          }
        } catch (error) {
          console.error("Error syncing item", item, error);
        }
      }),
    );
  }
}
