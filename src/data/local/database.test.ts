import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockOpenDatabaseSync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: (name: string) => mockOpenDatabaseSync(name),
}));

describe("getDatabase", () => {
  beforeEach(() => {
    jest.resetModules();
    mockOpenDatabaseSync.mockReset();
  });

  it("abre la base de datos una sola vez y reutiliza la instancia", () => {
    mockOpenDatabaseSync.mockReturnValue({
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    });

    const { getDatabase } = require("./database") as typeof import("./database");

    const first = getDatabase();
    const second = getDatabase();

    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
    expect(mockOpenDatabaseSync).toHaveBeenCalledWith("sastreria.db");
    expect(first).toBe(second);
  });

  it("serializa llamadas concurrentes a withTransactionAsync en vez de dejarlas intercalarse", async () => {
    const callOrder: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const rawWithTransactionAsync = jest.fn(
      async (task: () => Promise<void>) => {
        await task();
      },
    );

    mockOpenDatabaseSync.mockReturnValue({
      withTransactionAsync: rawWithTransactionAsync,
    });

    const { getDatabase } = require("./database") as typeof import("./database");
    const db = getDatabase();

    const firstPromise = db.withTransactionAsync(async () => {
      callOrder.push("first-start");
      await firstGate;
      callOrder.push("first-end");
    });

    const secondPromise = db.withTransactionAsync(async () => {
      callOrder.push("second-start");
    });

    // Deja correr las partes ya-resueltas de las microtasks pendientes sin
    // liberar la primera transacción — la segunda no debe haber arrancado.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(callOrder).toEqual(["first-start"]);

    releaseFirst();
    await firstPromise;
    await secondPromise;

    expect(callOrder).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("sigue procesando la cola aunque una transacción anterior falle", async () => {
    const callOrder: string[] = [];

    const rawWithTransactionAsync = jest.fn(
      async (task: () => Promise<void>) => {
        await task();
      },
    );

    mockOpenDatabaseSync.mockReturnValue({
      withTransactionAsync: rawWithTransactionAsync,
    });

    const { getDatabase } = require("./database") as typeof import("./database");
    const db = getDatabase();

    const firstPromise = db
      .withTransactionAsync(async () => {
        callOrder.push("first");
        throw new Error("fallo simulado");
      })
      .catch(() => undefined);

    const secondPromise = db.withTransactionAsync(async () => {
      callOrder.push("second");
    });

    await firstPromise;
    await secondPromise;

    expect(callOrder).toEqual(["first", "second"]);
  });

  it("reabre la conexion y reintenta una vez si expo-sqlite libera el objeto nativo (expo/expo#49799)", async () => {
    const brokenRunAsync = jest.fn(async () => {
      throw new Error(
        "Call to function 'NativeDatabase.prepareAsync' has been rejected.\n" +
          "→ Caused by: Cannot use shared object that was already released",
      );
    });
    const freshRunAsync = jest.fn(async () => "ok");

    mockOpenDatabaseSync
      .mockReturnValueOnce({
        withTransactionAsync: jest.fn(),
        runAsync: brokenRunAsync,
      })
      .mockReturnValueOnce({
        withTransactionAsync: jest.fn(),
        runAsync: freshRunAsync,
      });

    const { getDatabase } = require("./database") as typeof import("./database");
    const db = getDatabase();

    const result = await db.runAsync("INSERT INTO x VALUES (1)");

    expect(result).toBe("ok");
    expect(brokenRunAsync).toHaveBeenCalledTimes(1);
    expect(freshRunAsync).toHaveBeenCalledTimes(1);
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(2);
  });

  it("no reintenta y deja pasar el error si no es el bug conocido de shared object liberado", async () => {
    const runAsync = jest.fn(async () => {
      throw new Error("otro error real de SQL");
    });

    mockOpenDatabaseSync.mockReturnValue({
      withTransactionAsync: jest.fn(),
      runAsync,
    });

    const { getDatabase } = require("./database") as typeof import("./database");
    const db = getDatabase();

    await expect(db.runAsync("INSERT INTO x VALUES (1)")).rejects.toThrow(
      "otro error real de SQL",
    );
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
  });
});
