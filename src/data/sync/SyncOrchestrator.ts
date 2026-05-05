import type { SyncRunResult, SyncTriggerSource } from "./types";

export interface SyncQueueProcessorPort {
  runOnce(): Promise<SyncRunResult>;
}

export class SyncOrchestrator {
  private activeRunPromise: Promise<void> | null = null;
  private rerunRequested = false;
  private lastTriggerSource: SyncTriggerSource = "manual";

  constructor(private readonly processor: SyncQueueProcessorPort) {}

  async requestRun(source: SyncTriggerSource = "manual"): Promise<void> {
    this.lastTriggerSource = source;

    if (this.activeRunPromise) {
      this.rerunRequested = true;
      return this.activeRunPromise;
    }

    this.activeRunPromise = this.consumeRunRequests();
    return this.activeRunPromise;
  }

  async runNow(): Promise<SyncRunResult> {
    return this.processor.runOnce();
  }

  getLastTriggerSource(): SyncTriggerSource {
    return this.lastTriggerSource;
  }

  private async consumeRunRequests(): Promise<void> {
    try {
      while (true) {
        await this.processor.runOnce();

        if (!this.rerunRequested) {
          break;
        }

        this.rerunRequested = false;
      }
    } finally {
      this.activeRunPromise = null;
      this.rerunRequested = false;
    }
  }
}
