import type {
  CamisaMeasurement,
  Client,
  PantalonMeasurement,
} from "../../features/clients/domain/types";
import type { SyncDeleteLogEntry, SyncTransportAttemptResult } from "./types";

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
}
