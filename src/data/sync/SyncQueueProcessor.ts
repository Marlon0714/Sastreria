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
    const items = await this.queueRepository.getPendingItems(
      this.retryPolicy.batchSize,
    );

    const summary: SyncRunResult = {
      processed: 0,
      synced: 0,
      failed: 0,
    };

    for (const item of items) {
      summary.processed += 1;
      const didSync = await this.processItemWithRetry(item);

      if (didSync) {
        summary.synced += 1;
      } else {
        summary.failed += 1;
      }
    }

    return summary;
  }

  private async processItemWithRetry(item: SyncQueueItem): Promise<boolean> {
    for (
      let attempt = 1;
      attempt <= this.retryPolicy.maxRetries;
      attempt += 1
    ) {
      try {
        await this.syncItem(item);
        await this.queueRepository.markAsSynced(item.entityType, item.id);
        return true;
      } catch (syncError: unknown) {
        if (attempt === this.retryPolicy.maxRetries) {
          // TODO: replace with Crashlytics when telemetry is integrated
          console.error(
            JSON.stringify({
              level: "error",
              service: "SyncQueueProcessor",
              message: "Sync retries exhausted, marking item as error",
              entityType: item.entityType,
              itemId: item.id,
              error:
                syncError instanceof Error
                  ? syncError.message
                  : String(syncError),
            }),
          );
          await this.queueRepository.markAsError(item.entityType, item.id);
          return false;
        }

        await waitFor(this.retryPolicy.baseDelayMs * 2 ** (attempt - 1));
      }
    }

    return false;
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    if (item.entityType === "client") {
      await this.transport.syncClient(item.payload);
      return;
    }

    await this.transport.syncMeasurement(item.payload);
  }
}
