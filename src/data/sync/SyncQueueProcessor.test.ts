import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SyncTransport } from "./SyncTransport";
import { SyncQueueProcessor } from "./SyncQueueProcessor";
import type { SyncQueueItem } from "./types";

const clientItem: SyncQueueItem = {
  entityType: "client",
  id: "c-1",
  updatedAt: "2026-04-30T09:00:00.000Z",
  syncStatus: "pending",
  payload: {
    id: "c-1",
    firstName: "Ana",
    lastName: "Torres",
    phone: "3001234567",
    notes: null,
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-04-30T09:00:00.000Z",
    syncStatus: "pending",
    measurements: [],
  },
};

const measurementItem: SyncQueueItem = {
  entityType: "measurement",
  id: "m-1",
  updatedAt: "2026-04-30T09:30:00.000Z",
  syncStatus: "error",
  payload: {
    id: "m-1",
    clientId: "c-1",
    measuredAt: "2026-04-30T09:00:00.000Z",
    pechoCm: 90,
    cinturaCm: 70,
    caderaCm: 95,
    largoCm: 110,
    notes: null,
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-04-30T09:30:00.000Z",
    syncStatus: "error",
  },
};

describe("SyncQueueProcessor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marks item as synced when transport succeeds", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };

    const transport: SyncTransport = {
      syncClient: jest.fn(async () => Promise.resolve()),
      syncMeasurement: jest.fn(async () => Promise.resolve()),
    };

    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith("client", "c-1");
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("syncs measurement items through measurement transport", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [measurementItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };

    const transport: SyncTransport = {
      syncClient: jest.fn(async () => Promise.resolve()),
      syncMeasurement: jest.fn(async () => Promise.resolve()),
    };

    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).not.toHaveBeenCalled();
    expect(transport.syncMeasurement).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "measurement",
      "m-1",
    );
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("marks item as error after exhausting retries", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };

    const transport: SyncTransport = {
      syncClient: jest.fn(async () => Promise.reject(new Error("network"))),
      syncMeasurement: jest.fn(async () => Promise.resolve()),
    };

    const processor = new SyncQueueProcessor(queueRepository, transport, {
      maxRetries: 3,
      baseDelayMs: 200,
    });

    // Act
    const runPromise = processor.runOnce();
    await jest.advanceTimersByTimeAsync(200);
    await jest.advanceTimersByTimeAsync(400);
    const result = await runPromise;

    // Assert
    expect(result).toEqual({ processed: 1, synced: 0, failed: 1 });
    expect(transport.syncClient).toHaveBeenCalledTimes(3);
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).toHaveBeenCalledWith("client", "c-1");
  });

  it("uses exponential backoff between retry attempts", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };

    const transport: SyncTransport = {
      syncClient: jest
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("network"))
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValueOnce(),
      syncMeasurement: jest.fn(async () => Promise.resolve()),
    };

    const processor = new SyncQueueProcessor(queueRepository, transport, {
      maxRetries: 3,
      baseDelayMs: 200,
    });

    // Act
    const runPromise = processor.runOnce();
    await jest.advanceTimersByTimeAsync(200);
    await jest.advanceTimersByTimeAsync(400);
    const result = await runPromise;

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).toHaveBeenCalledTimes(3);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith("client", "c-1");
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("returns an empty summary when queue has no items", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => []),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };

    const transport: SyncTransport = {
      syncClient: jest.fn(async () => Promise.resolve()),
      syncMeasurement: jest.fn(async () => Promise.resolve()),
    };

    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 0, synced: 0, failed: 0 });
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
    expect(transport.syncClient).not.toHaveBeenCalled();
    expect(transport.syncMeasurement).not.toHaveBeenCalled();
  });
});
