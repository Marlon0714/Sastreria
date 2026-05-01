import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";

export interface SyncTransport {
  syncClient(client: Client): Promise<void>;
  syncCamisaMeasurement(measurement: CamisaMeasurement): Promise<void>;
  syncPantalonMeasurement(measurement: PantalonMeasurement): Promise<void>;
}

export class NoopSyncTransport implements SyncTransport {
  async syncClient(_client: Client): Promise<void> {
    return Promise.resolve();
  }

  async syncCamisaMeasurement(_measurement: CamisaMeasurement): Promise<void> {
    return Promise.resolve();
  }

  async syncPantalonMeasurement(
    _measurement: PantalonMeasurement,
  ): Promise<void> {
    return Promise.resolve();
  }
}
