import type { Client, Measurement } from "../../features/clients/domain/types";

export interface SyncTransport {
  syncClient(client: Client): Promise<void>;
  syncMeasurement(measurement: Measurement): Promise<void>;
}

export class NoopSyncTransport implements SyncTransport {
  async syncClient(_client: Client): Promise<void> {
    return Promise.resolve();
  }

  async syncMeasurement(_measurement: Measurement): Promise<void> {
    return Promise.resolve();
  }
}
