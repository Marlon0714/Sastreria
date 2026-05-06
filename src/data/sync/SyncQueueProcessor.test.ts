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
import type { SyncQueueItem, SyncTransportAttemptResult } from "./types";
import { useSyncStatusStore } from "../../shared/state/syncStatusStore";

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

function syncedResult(): SyncTransportAttemptResult {
  return { outcome: "synced" };
}

function makeMockTransport(): jest.Mocked<SyncTransport> {
  return {
    syncClient: jest.fn(async () => Promise.resolve(syncedResult())),
    syncCamisaMeasurement: jest.fn(async () => Promise.resolve(syncedResult())),
    syncPantalonMeasurement: jest.fn(async () =>
      Promise.resolve(syncedResult()),
    ),
    syncDeleteLogEntry: jest.fn(async () => Promise.resolve(syncedResult())),
  };
}

describe("SyncQueueProcessor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSyncStatusStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marks item as synced when transport confirms cloud success", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 1, deferred: 0, failed: 0 });
    expect(transport.syncClient).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith("client", "c-1");
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("does not mark item as synced for deferred_local_only outcome", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => true),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({
      outcome: "deferred_local_only",
    });
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 0, deferred: 1, failed: 0 });
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("maintains pending state for deferred_offline outcome", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => true),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({ outcome: "deferred_offline" });
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 0, deferred: 1, failed: 0 });
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).not.toHaveBeenCalled();
  });

  it("syncs camisa measurement items through camisa transport method", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [camisaItem]),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 1, deferred: 0, failed: 0 });
    expect(transport.syncCamisaMeasurement).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "camisa_measurement",
      "cam-1",
    );
  });

  it("syncs pantalon measurement items through pantalon transport method", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [pantalonItem]),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 1, deferred: 0, failed: 0 });
    expect(transport.syncPantalonMeasurement).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "pantalon_measurement",
      "pan-1",
    );
  });

  it("syncs delete log items through delete transport method", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [deleteItem]),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 1, synced: 1, deferred: 0, failed: 0 });
    expect(transport.syncDeleteLogEntry).toHaveBeenCalledTimes(1);
    expect(queueRepository.markAsSynced).toHaveBeenCalledWith(
      "delete_log",
      "del-1",
    );
  });

  it("marks item as error after exhausting retries on failed outcome", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => true),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValue({
      outcome: "failed",
      errorCode: "500",
    });

    const processor = new SyncQueueProcessor(queueRepository, transport, {
      maxRetries: 3,
      baseDelayMs: 200,
    });

    const runPromise = processor.runOnce();
    await jest.advanceTimersByTimeAsync(200);
    await jest.advanceTimersByTimeAsync(400);
    const result = await runPromise;

    expect(result).toEqual({ processed: 1, synced: 0, deferred: 0, failed: 1 });
    expect(transport.syncClient).toHaveBeenCalledTimes(3);
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
    expect(queueRepository.markAsError).toHaveBeenCalledWith("client", "c-1");
  });

  it("returns an empty summary when queue has no items", async () => {
    const queueRepository = {
      getPendingItems: jest.fn(async () => []),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    const processor = new SyncQueueProcessor(queueRepository, transport);

    const result = await processor.runOnce();

    expect(result).toEqual({ processed: 0, synced: 0, deferred: 0, failed: 0 });
  });

  it("no resetea lastSyncError a null cuando todos los items son deferred_local_only", async () => {
    // Arrange — hay un error previo en el store
    useSyncStatusStore.getState().setLastSyncError("Error previo de red");

    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => true),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({
      outcome: "deferred_local_only",
    });
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    await processor.runOnce();

    // Assert — el error previo NO fue borrado porque no hubo sync exitoso
    expect(useSyncStatusStore.getState().lastSyncError).toBe(
      "Error previo de red",
    );
    // Y el item no fue marcado como synced
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
  });

  it("no resetea lastSyncError a null cuando todos los items son deferred_offline", async () => {
    // Arrange
    useSyncStatusStore.getState().setLastSyncError("Sin conexion");

    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => true),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({ outcome: "deferred_offline" });
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    await processor.runOnce();

    // Assert
    expect(useSyncStatusStore.getState().lastSyncError).toBe("Sin conexion");
    expect(queueRepository.markAsSynced).not.toHaveBeenCalled();
  });

  it("actualiza hasPending en el store segun el resultado de hasPendingItems tras el run", async () => {
    // Arrange
    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => false), // cola vacía después del sync
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({ outcome: "synced" });
    const processor = new SyncQueueProcessor(queueRepository, transport);
    useSyncStatusStore.getState().setHasPending(true);

    // Act
    await processor.runOnce();

    // Assert — el store refleja que ya no hay pendientes
    expect(useSyncStatusStore.getState().hasPending).toBe(false);
  });

  it("borra lastSyncError al sincronizar con exito un item", async () => {
    // Arrange
    useSyncStatusStore.getState().setLastSyncError("Error anterior");

    const queueRepository = {
      getPendingItems: jest.fn(async () => [clientItem]),
      hasPendingItems: jest.fn(async () => false),
      markAsSynced: jest.fn(async () => Promise.resolve()),
      markAsError: jest.fn(async () => Promise.resolve()),
    };
    const transport = makeMockTransport();
    transport.syncClient.mockResolvedValueOnce({ outcome: "synced" });
    const processor = new SyncQueueProcessor(queueRepository, transport);

    // Act
    await processor.runOnce();

    // Assert — synced limpia el error
    expect(useSyncStatusStore.getState().lastSyncError).toBeNull();
  });
});
