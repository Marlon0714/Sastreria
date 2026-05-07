import type { SyncRunResult, SyncTriggerSource } from "./types";

export interface SyncQueueProcessorPort {
  runOnce(): Promise<SyncRunResult>;
}

interface SyncOrchestratorOptions {
  networkRecoveredCooldownMs?: number;
  now?: () => number;
}

const DEFAULT_NETWORK_RECOVERED_COOLDOWN_MS = 8000;

export class SyncOrchestrator {
  private activeRunPromise: Promise<void> | null = null;
  private rerunRequested = false;
  private lastTriggerSource: SyncTriggerSource = "manual";
  private lastNetworkRecoveredTriggerAt = 0;
  private readonly networkRecoveredCooldownMs: number;
  private readonly now: () => number;

  constructor(
    private readonly processor: SyncQueueProcessorPort,
    options: SyncOrchestratorOptions = {},
  ) {
    this.networkRecoveredCooldownMs =
      options.networkRecoveredCooldownMs ??
      DEFAULT_NETWORK_RECOVERED_COOLDOWN_MS;
    this.now = options.now ?? (() => Date.now());
  }

  async requestRun(source: SyncTriggerSource = "manual"): Promise<void> {
    if (this.shouldThrottle(source)) {
      return this.activeRunPromise ?? Promise.resolve();
    }

    this.lastTriggerSource = source;

    if (source === "network_recovered") {
      this.lastNetworkRecoveredTriggerAt = this.now();
    }

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

  private shouldThrottle(source: SyncTriggerSource): boolean {
    if (source !== "network_recovered") {
      return false;
    }

    if (this.lastNetworkRecoveredTriggerAt === 0) {
      return false;
    }

    return (
      this.now() - this.lastNetworkRecoveredTriggerAt <
      this.networkRecoveredCooldownMs
    );
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
