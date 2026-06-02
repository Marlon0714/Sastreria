import { describe, expect, it, jest } from "@jest/globals";

import { SyncOrchestrator } from "./SyncOrchestrator";
import type { SyncRunResult } from "./types";

function createDeferredPromise(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve: (() => void) | undefined;

  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {
    promise,
    resolve: (): void => {
      resolve?.();
    },
  };
}

function emptyResult(): SyncRunResult {
  return { processed: 0, synced: 0, deferred: 0, failed: 0 };
}

describe("SyncOrchestrator", () => {
  it("deduplicates concurrent requests and runs one extra pass when requested during execution", async () => {
    const firstRun = createDeferredPromise();
    const secondRun = createDeferredPromise();

    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockImplementationOnce(async () => {
          await firstRun.promise;
          return { processed: 1, synced: 1, deferred: 0, failed: 0 };
        })
        .mockImplementationOnce(async () => {
          await secondRun.promise;
          return emptyResult();
        })
        .mockResolvedValue(emptyResult()),
    };

    const orchestrator = new SyncOrchestrator(processor);
    const runA = orchestrator.requestRun();
    const runB = orchestrator.requestRun();
    const runC = orchestrator.requestRun();

    expect(processor.runOnce).toHaveBeenCalledTimes(1);

    firstRun.resolve();
    secondRun.resolve();
    await Promise.all([runA, runB, runC]);
    expect(processor.runOnce).toHaveBeenCalledTimes(2);

    await orchestrator.requestRun();
    expect(processor.runOnce).toHaveBeenCalledTimes(3);
  });

  it("deduplicates concurrent requests across multiple trigger sources", async () => {
    const firstRun = createDeferredPromise();
    const secondRun = createDeferredPromise();
    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockImplementationOnce(async () => {
          await firstRun.promise;
          return { processed: 1, synced: 1, deferred: 0, failed: 0 };
        })
        .mockImplementationOnce(async () => {
          await secondRun.promise;
          return emptyResult();
        }),
    };
    const orchestrator = new SyncOrchestrator(processor);

    const byRealtime = orchestrator.requestRun("realtime");
    const byForeground = orchestrator.requestRun("foreground");
    const byManual = orchestrator.requestRun("manual");

    firstRun.resolve();
    secondRun.resolve();
    await Promise.all([byRealtime, byForeground, byManual]);

    expect(processor.runOnce).toHaveBeenCalledTimes(2);
    expect(orchestrator.getLastTriggerSource()).toBe("manual");
  });

  it("throttles network_recovered bursts with cooldown", async () => {
    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockResolvedValue(emptyResult()),
    };

    let nowValue = 1000;
    const orchestrator = new SyncOrchestrator(processor, {
      networkRecoveredCooldownMs: 5000,
      now: () => nowValue,
    });

    await orchestrator.requestRun("network_recovered");
    await orchestrator.requestRun("network_recovered");

    expect(processor.runOnce).toHaveBeenCalledTimes(1);

    nowValue += 6000;
    await orchestrator.requestRun("network_recovered");

    expect(processor.runOnce).toHaveBeenCalledTimes(2);
    expect(orchestrator.getLastTriggerSource()).toBe("network_recovered");
  });

  it("runNow delegates directly to processor", async () => {
    const expected: SyncRunResult = {
      processed: 2,
      synced: 2,
      deferred: 0,
      failed: 0,
    };
    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockResolvedValue(expected),
    };

    const orchestrator = new SyncOrchestrator(processor);
    const result = await orchestrator.runNow();

    expect(result).toEqual(expected);
    expect(processor.runOnce).toHaveBeenCalledTimes(1);
  });

  it("propagates requestRun failure and allows later runs", async () => {
    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockRejectedValueOnce(new Error("temporary outage"))
        .mockResolvedValueOnce(emptyResult()),
    };

    const orchestrator = new SyncOrchestrator(processor);

    await expect(orchestrator.requestRun()).rejects.toThrow("temporary outage");
    await expect(orchestrator.requestRun()).resolves.toBeUndefined();
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
  });

  it("debería ajustar cooldown dinámicamente basado en métricas de red", async () => {
    const processor = {
      runOnce: jest.fn(async () => ({
        processed: 1,
        synced: 1,
        deferred: 0,
        failed: 0,
      })),
    };
    const orchestrator = new SyncOrchestrator(processor);
    // Mock del método getNetworkLatency
    orchestrator.getNetworkLatency = jest.fn(() => 2000);

    const cooldown = orchestrator.calculateDynamicCooldown();
    expect(cooldown).toBe(4000);
  });

  it("maneja excepciones en processor.runOnce", async () => {
    const processor = {
      runOnce: jest.fn(async () => {
        throw new Error("RunOnce error");
      }),
    };
    const orchestrator = new SyncOrchestrator(processor);

    await expect(orchestrator.requestRun()).rejects.toThrow("RunOnce error");
  });
});
