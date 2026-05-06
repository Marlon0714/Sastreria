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
  operationType: "upsert",
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

const camisaItem: SyncQueueItem = {
  entityType: "camisa_measurement",
  id: "cam-1",
  updatedAt: "2026-04-30T09:30:00.000Z",
  syncStatus: "error",
  operationType: "upsert",
  payload: {
    id: "cam-1",
    clientId: "c-1",
    espalda: 42,
    hombro: 14,
    talleDelantero: 43,
    talleTrasero: 41,
    distancia: 22,
    separacion: 10,
    pecho: 98,
    cintura: 80,
    base: 100,
    largo: 70,
    largoManga: 62,
    anchoManga: 32,
    escote: 18,
    cuello: null,
    brazo: null,
    puno: null,
    notes: null,
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-04-30T09:30:00.000Z",
    syncStatus: "error",
    changedBy: "user-1",
    changedAt: "2026-04-30T09:30:00.000Z",
  },
};

const pantalonItem: SyncQueueItem = {
  entityType: "pantalon_measurement",
  id: "pan-1",
  updatedAt: "2026-04-30T09:45:00.000Z",
  operationType: "upsert",
  syncStatus: "pending",
  payload: {
    id: "pan-1",
    clientId: "c-1",
    largo: 102,
    cintura: 88,
    base: 110,
    tiro: 28,
    pierna: 54,
    rodilla: 44,
    bota: 38,
    notes: null,
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-04-30T09:45:00.000Z",
    syncStatus: "pending",
    changedBy: "user-2",
    changedAt: "2026-04-30T09:45:00.000Z",
  },
};

const deleteItem: SyncQueueItem = {
  entityType: "delete_log",
  id: "del-1",
  updatedAt: "2026-04-30T09:50:00.000Z",
  operationType: "delete",
  syncStatus: "pending",
  payload: {
    id: "del-1",
    entityType: "client",
    entityId: "c-1",
    deletedAt: "2026-04-30T09:50:00.000Z",
    syncStatus: "pending",
  },
};

function makeMockTransport(): jest.Mocked<SyncTransport> {
  return {
    syncClient: jest.fn(async () => Promise.resolve()),
    syncCamisaMeasurement: jest.fn(async () => Promise.resolve()),
    syncPantalonMeasurement: jest.fn(async () => Promise.resolve()),
    syncDeleteLogEntry: jest.fn(async () => Promise.resolve()),
  };
}

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
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith("client", "c-1");
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("syncs camisa measurement items through camisa transport method", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [camisaItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).not.toHaveBeenCalled();
    expect(transport.syncCamisaMeasurement).toHaveBeenCalledTimes(1);
    expect(transport.syncPantalonMeasurement).not.toHaveBeenCalled();
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "camisa_measurement",
      "cam-1",
    );
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("syncs pantalon measurement items through pantalon transport method", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [pantalonItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncClient).not.toHaveBeenCalled();
    expect(transport.syncCamisaMeasurement).not.toHaveBeenCalled();
    expect(transport.syncPantalonMeasurement).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "pantalon_measurement",
      "pan-1",
    );
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("syncs delete log items through delete transport method", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [deleteItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0 });
    expect(transport.syncDeleteLogEntry).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "delete_log",
      "del-1",
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
    const transport = makeMockTransport();
    transport.syncClient.mockRejectedValue(new Error("network"));

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
    const transport = makeMockTransport();
    transport.syncClient
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce();

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
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    const result = await processor.runOnce();

    // Assert
    expect(result).toEqual({ processed: 0, synced: 0, failed: 0 });
    expect(transport.syncClient).not.toHaveBeenCalled();
    expect(transport.syncCamisaMeasurement).not.toHaveBeenCalled();
    expect(transport.syncPantalonMeasurement).not.toHaveBeenCalled();
    expect(transport.syncDeleteLogEntry).not.toHaveBeenCalled();
  });

  it("marks delete log item as error when delete transport fails repeatedly", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [deleteItem]),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncDeleteLogEntry.mockRejectedValue(new Error("network"));

    const processor = new SyncQueueProcessor(queueRepository, transport, {
      maxRetries: 2,
      baseDelayMs: 100,
    });

    // Act
    const runPromise = processor.runOnce();
    await jest.advanceTimersByTimeAsync(100);
    const result = await runPromise;

    // Assert
    expect(result).toEqual({ processed: 1, synced: 0, failed: 1 });
    expect(transport.syncDeleteLogEntry).toHaveBeenCalledTimes(2);
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).toHaveBeenCalledWith(
      "delete_log",
      "del-1",
    );
  });
});
