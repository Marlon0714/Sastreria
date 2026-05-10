import { useSyncStatusStore } from "../../shared/state/syncStatusStore";
import type { SyncTransport } from "./SyncTransport";
import type { RetryPolicy, SyncQueueItem, SyncRunResult } from "./types";
import type { SyncQueueRepositoryPort } from "./SyncQueueRepository";

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 200,
  batchSize: 50,
};

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class SyncQueueProcessor {
  private readonly retryPolicy: RetryPolicy;

  constructor(
    private readonly queueRepository: SyncQueueRepositoryPort,
    private readonly transport: SyncTransport,
    retryPolicy: Partial<RetryPolicy> = {},
  ) {
    this.retryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...retryPolicy,
    };
  }

  async runOnce(): Promise<SyncRunResult> {
    useSyncStatusStore.getState().setLastSyncAttempt(new Date().toISOString());

    const items = await this.queueRepository.getPendingItems(
      this.retryPolicy.batchSize,
    );

    const summary: SyncRunResult = {
      processed: 0,
      synced: 0,
      deferred: 0,
      failed: 0,
    };

    const concurrency = this.retryPolicy.concurrency ?? 1;
    const itemBatches = this.chunkArray(items, concurrency);

    for (const batch of itemBatches) {
      await Promise.all(
        batch.map(async (item) => {
          summary.processed += 1;
          const outcome = await this.processItemWithRetry(item);

          if (outcome === "synced") {
            summary.synced += 1;
          } else if (outcome === "failed") {
            summary.failed += 1;
          } else {
            summary.deferred += 1;
          }
        }),
      );
    }

    const hasPending = await this.queueRepository.hasPendingItems();
    useSyncStatusStore.getState().setHasPending(hasPending);

    return summary;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async processItemWithRetry(
    item: SyncQueueItem,
  ): Promise<"synced" | "deferred" | "failed"> {
    for (
      let attempt = 1;
      attempt <= this.retryPolicy.maxRetries;
      attempt += 1
    ) {
      let result: Awaited<ReturnType<SyncTransport["syncClient"]>>;

      try {
        result = await this.syncItem(item);
      } catch {
        result = { outcome: "failed", errorCode: "unexpected_error" };
      }

      // Solo marcar como synced si outcome=cloud-ok y modo cloud
      const mode = useSyncStatusStore.getState().mode;
      if (result.outcome === "synced") {
        if (mode === "cloud") {
          try {
            await this.queueRepository.markAsSynced(item.entityType, item.id);
            useSyncStatusStore.getState().setLastSyncError(null);
            return "synced";
          } catch (err) {
            console.error(
              JSON.stringify({
                level: "error",
                service: "SyncQueueProcessor",
                message: "Error en markAsSynced",
                entityType: item.entityType,
                itemId: item.id,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
            await this.queueRepository.markAsError(item.entityType, item.id);
            useSyncStatusStore
              .getState()
              .setLastSyncError("No se pudo sincronizar un cambio pendiente.");
            return "failed";
          }
        } else {
          // Log estructurado: intento de marcar synced en modo local-only/offline
          console.warn(
            JSON.stringify({
              level: "warn",
              service: "SyncQueueProcessor",
              message:
                "Intento de marcar como synced en modo no-cloud, ignorado",
              entityType: item.entityType,
              itemId: item.id,
              mode,
              outcome: result.outcome,
            }),
          );
          return "deferred";
        }
      }

      if (
        result.outcome === "deferred_local_only" ||
        result.outcome === "deferred_offline"
      ) {
        return "deferred";
      }

      if (attempt === this.retryPolicy.maxRetries) {
        try {
          await this.queueRepository.markAsError(item.entityType, item.id);
        } catch (err) {
          console.error(
            JSON.stringify({
              level: "error",
              service: "SyncQueueProcessor",
              message: "Error en markAsError",
              entityType: item.entityType,
              itemId: item.id,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
        useSyncStatusStore
          .getState()
          .setLastSyncError("No se pudo sincronizar un cambio pendiente.");
        return "failed";
      }

      await waitFor(this.retryPolicy.baseDelayMs * 2 ** (attempt - 1));
    }

    return "failed";
  }

  private async syncItem(
    item: SyncQueueItem,
  ): ReturnType<SyncTransport["syncClient"]> {
    if (item.entityType === "delete_log") {
      return this.transport.syncDeleteLogEntry(item.payload);
    }

    if (item.entityType === "client") {
      return this.transport.syncClient(item.payload);
    }

    if (item.entityType === "camisa_measurement") {
      return this.transport.syncCamisaMeasurement(item.payload);
    }

    return this.transport.syncPantalonMeasurement(item.payload);
  }
}
