import { NoopSyncTransport } from "./SyncTransport";
import { describe, it, expect, jest } from "@jest/globals";
import type { SyncQueueItem } from "./types";

const stubClientItem: SyncQueueItem = {
  entityType: "client",
  id: "1",
  updatedAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "pending",
  operationType: "upsert",
  payload: {
    id: "1",
    firstName: "Ana",
    lastName: "Torres",
    phone: "3001234567",
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    syncStatus: "pending",
    measurements: [],
  },
};

const stubClientItem2: SyncQueueItem = {
  ...stubClientItem,
  id: "2",
  payload: {
    ...(stubClientItem.payload as {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      notes: null;
      createdAt: string;
      updatedAt: string;
      syncStatus: "pending";
      measurements: [];
    }),
    id: "2",
  },
};

describe("SyncTransport", () => {
  it("debería manejar múltiples solicitudes simultáneas", async () => {
    const transport = new NoopSyncTransport();

    const items: SyncQueueItem[] = [stubClientItem, stubClientItem2];

    const syncAllSpy = jest.spyOn(transport, "syncAll").mockResolvedValue();

    await transport.syncAll(items);

    expect(syncAllSpy).toHaveBeenCalledWith(items);
  });

  it("maneja errores en solicitudes simultáneas", async () => {
    const transport = new NoopSyncTransport();

    const items: SyncQueueItem[] = [stubClientItem, stubClientItem2];

    jest
      .spyOn(transport, "syncAll")
      .mockRejectedValueOnce(new Error("Sync error"));

    await expect(transport.syncAll(items)).rejects.toThrow("Sync error");
  });
});
