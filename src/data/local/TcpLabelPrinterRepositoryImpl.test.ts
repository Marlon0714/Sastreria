import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { PrinterTarget } from "../../features/printing/domain/types";
import { TcpLabelPrinterRepositoryImpl } from "./TcpLabelPrinterRepositoryImpl";

const mockCreateConnection = jest.fn();

jest.mock("react-native-tcp-socket", () => ({
  __esModule: true,
  default: {
    createConnection: (...args: unknown[]) => mockCreateConnection(...args),
  },
}));

const printer: PrinterTarget = {
  id: "printer-1",
  name: "Mostrador",
  host: "192.168.1.50",
  port: 9100,
};

describe("TcpLabelPrinterRepositoryImpl", () => {
  beforeEach(() => {
    mockCreateConnection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rechaza la impresión ante IP desactualizada aunque destroy lance un error", async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const socket = {
      on: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
        return socket;
      }),
      write: jest.fn(),
      destroy: jest.fn(() => {
        throw new Error("Socket already closed");
      }),
    };
    mockCreateConnection.mockReturnValue(socket);
    jest.spyOn(console, "error").mockImplementation(() => {});

    const repository = new TcpLabelPrinterRepositoryImpl();
    const printPromise = repository.printLabelJob(printer, new Uint8Array([1]));

    await Promise.resolve();
    const error = Object.assign(new Error("Connection refused"), {
      code: "ECONNREFUSED",
    });
    listeners.get("error")?.(error);

    await expect(printPromise).rejects.toThrow(
      "La impresora rechazó la conexión en 192.168.1.50:9100",
    );
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });
});
