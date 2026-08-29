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

  it("el cooldown de network_recovered es fijo, no se ajusta dinámicamente (no hay medición real de latencia)", async () => {
    // Regresión de código fantasma: antes existían `getNetworkLatency()`
    // (siempre devolvía 0) y `calculateDynamicCooldown()`, que aparentaban
    // ajustar el cooldown según la latencia de red — pero como
    // getNetworkLatency() nunca devolvía otra cosa que 0, el "ajuste" nunca
    // cambiaba nada. Se eliminó esa capa; este test fija el contrato real:
    // el cooldown configurado se respeta tal cual, sin importar cuántos
    // triggers de network_recovered ocurran.
    const processor = {
      runOnce: jest
        .fn<() => Promise<SyncRunResult>>()
        .mockResolvedValue(emptyResult()),
    };

    // Arranca en 1000 (no en 0): `lastNetworkRecoveredTriggerAt === 0` es el
    // centinela interno de "todavía no hubo ningún trigger" — usar 0 como
    // primer valor de now() confundiría el propio mecanismo de throttle.
    let nowValue = 1000;
    const orchestrator = new SyncOrchestrator(processor, {
      networkRecoveredCooldownMs: 4000,
      now: () => nowValue,
    });

    await orchestrator.requestRun("network_recovered");
    nowValue += 3999; // todavía dentro del cooldown fijo de 4000ms
    await orchestrator.requestRun("network_recovered");
    expect(processor.runOnce).toHaveBeenCalledTimes(1);

    nowValue += 2; // ahora sí supera los 4000ms desde el primer trigger
    await orchestrator.requestRun("network_recovered");
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
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
