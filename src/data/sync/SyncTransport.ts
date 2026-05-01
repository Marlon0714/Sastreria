import type { Client } from "../../features/clients/domain/types";
import type { SyncMeasurementQueueItem } from "./types";

export interface SyncTransport {
  syncClient(client: Client): Promise<void>;
  syncMeasurement(
    measurement: SyncMeasurementQueueItem["payload"],
  ): Promise<void>;
}

export class NoopSyncTransport implements SyncTransport {
  async syncClient(_client: Client): Promise<void> {
    return Promise.resolve();
  }

  async syncMeasurement(
    _measurement: SyncMeasurementQueueItem["payload"],
  ): Promise<void> {
    return Promise.resolve();
  }
}
