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

describe("SyncOrchestrator", () => {
  it("deduplicates concurrent requests and runs one extra pass when requested during execution", async () => {
    const firstRun = createDeferredPromise();
    const secondRun = createDeferredPromise();

    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockImplementationOnce(async () => {
          await firstRun.promise;
          return { processed: 1, synced: 1, failed: 0 };
        })
        .mockImplementationOnce(async () => {
          await secondRun.promise;
          return { processed: 0, synced: 0, failed: 0 };
        })
        .mockResolvedValue({ processed: 0, synced: 0, failed: 0 }),
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

  it("runNow delegates directly to processor", async () => {
    const expected: SyncRunResult = { processed: 2, synced: 2, failed: 0 };
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
        .mockResolvedValueOnce({ processed: 0, synced: 0, failed: 0 }),
    };

    const orchestrator = new SyncOrchestrator(processor);

    await expect(orchestrator.requestRun()).rejects.toThrow("temporary outage");
    await expect(orchestrator.requestRun()).resolves.toBeUndefined();
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
  });
});
