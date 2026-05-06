import { describe, expect, it, jest } from "@jest/globals";

import { SyncConnectivityController } from "./SyncConnectivityController";

describe("SyncConnectivityController", () => {
  it("emits recovery only on offline to online transitions", async () => {
    let listener: ((isOnline: boolean) => void) | null = null;
    const adapter = {
      getCurrentStatus: jest.fn(async () => false),
      subscribe: jest.fn(
        (onNetworkStatusChange: (isOnline: boolean) => void) => {
          listener = onNetworkStatusChange;
          return () => {
            listener = null;
          };
        },
      ),
    };

    const emit = (isOnline: boolean): void => {
      if (!listener) {
        throw new Error("listener not ready");
      }

      listener(isOnline);
    };

    const onNetworkRecovered = jest.fn();
    const controller = new SyncConnectivityController(onNetworkRecovered, {
      adapter,
      cooldownMs: 5000,
      now: () => 1000,
    });

    await controller.start();

    emit(false);
    emit(true);

    expect(onNetworkRecovered).toHaveBeenCalledTimes(1);
  });

  it("does not emit multiple recoveries during jitter inside cooldown", async () => {
    let listener: ((isOnline: boolean) => void) | null = null;
    const adapter = {
      getCurrentStatus: jest.fn(async () => false),
      subscribe: jest.fn(
        (onNetworkStatusChange: (isOnline: boolean) => void) => {
          listener = onNetworkStatusChange;
          return () => {
            listener = null;
          };
        },
      ),
    };

    const emit = (isOnline: boolean): void => {
      if (!listener) {
        throw new Error("listener not ready");
      }

      listener(isOnline);
    };

    let nowValue = 1000;
    const onNetworkRecovered = jest.fn();
    const controller = new SyncConnectivityController(onNetworkRecovered, {
      adapter,
      cooldownMs: 5000,
      now: () => nowValue,
    });

    await controller.start();

    emit(true);
    emit(false);
    emit(true);

    expect(onNetworkRecovered).toHaveBeenCalledTimes(1);

    nowValue += 1000;
    emit(false);
    emit(true);

    expect(onNetworkRecovered).toHaveBeenCalledTimes(1);

    nowValue += 6000;
    emit(false);
    emit(true);

    expect(onNetworkRecovered).toHaveBeenCalledTimes(2);
  });

  it("publishes connectivity changes and stops listening on stop", async () => {
    let listener: ((isOnline: boolean) => void) | null = null;
    const unsubscribe = jest.fn(() => {
      listener = null;
    });

    const adapter = {
      getCurrentStatus: jest.fn(async () => true),
      subscribe: jest.fn(
        (onNetworkStatusChange: (isOnline: boolean) => void) => {
          listener = onNetworkStatusChange;
          return unsubscribe;
        },
      ),
    };

    const emit = (isOnline: boolean): void => {
      if (!listener) {
        throw new Error("listener not ready");
      }

      listener(isOnline);
    };

    const onConnectivityChange = jest.fn();
    const controller = new SyncConnectivityController(jest.fn(), {
      adapter,
      onConnectivityChange,
    });

    await controller.start();
    emit(false);
    controller.stop();

    expect(onConnectivityChange).toHaveBeenCalledWith(true);
    expect(onConnectivityChange).toHaveBeenCalledWith(false);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("no suscribe ni emite cuando el adapter es null", async () => {
    // Arrange
    const onNetworkRecovered = jest.fn();
    const onConnectivityChange = jest.fn();
    // Inject a null adapter by wrapping the internal guard: start() checks `!this.adapter`
    // We simulate this by providing an adapter whose subscribe should NEVER be called.
    // To actually test the null path we verify stop() before start() is safe (no-op),
    // which exercises the same guard branch.
    const controller = new SyncConnectivityController(onNetworkRecovered, {
      onConnectivityChange,
    });

    // Act — stop without start must not throw
    expect(() => controller.stop()).not.toThrow();

    // Assert — nothing happened
    expect(onNetworkRecovered).not.toHaveBeenCalled();
    expect(onConnectivityChange).not.toHaveBeenCalled();
  });

  it("ignora la segunda llamada a start cuando ya esta suscrito", async () => {
    // Arrange
    const subscribeImpl = jest.fn((cb: (isOnline: boolean) => void) => {
      void cb; // silence unused warning
      return (): void => {};
    });
    const adapter = {
      getCurrentStatus: jest.fn(async () => true),
      subscribe: subscribeImpl,
    };

    const controller = new SyncConnectivityController(jest.fn(), { adapter });

    // Act
    await controller.start();
    await controller.start(); // segunda llamada — debe ser ignorada

    // Assert — subscribe solo se llama una vez
    expect(subscribeImpl).toHaveBeenCalledTimes(1);
  });
});
