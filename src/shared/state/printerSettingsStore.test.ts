import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  PrinterSettingsValidationError,
  usePrinterSettingsStore,
} from "./printerSettingsStore";

const mockGetItemAsync = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItemAsync =
  jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string): Promise<string | null> => mockGetItemAsync(key),
  setItemAsync: (key: string, value: string): Promise<void> =>
    mockSetItemAsync(key, value),
}));

describe("printerSettingsStore", () => {
  beforeEach(() => {
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue();
    usePrinterSettingsStore.setState({ printers: [] });
  });

  it("empieza sin impresoras configuradas", () => {
    expect(usePrinterSettingsStore.getState().printers).toEqual([]);
  });

  it("hydrate no cambia el estado cuando no hay nada guardado", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await usePrinterSettingsStore.getState().hydrate();

    expect(usePrinterSettingsStore.getState().printers).toEqual([]);
  });

  it("hydrate restaura la lista de impresoras guardada", async () => {
    const stored = [
      {
        id: "p1",
        name: "Mostrador",
        host: "192.168.1.50",
        port: 9100,
        protocol: "escpos-raster",
        labelWidthMm: 50,
        labelLengthMm: 70,
      },
    ];
    mockGetItemAsync.mockResolvedValue(JSON.stringify(stored));

    await usePrinterSettingsStore.getState().hydrate();

    expect(usePrinterSettingsStore.getState().printers).toEqual(stored);
  });

  it("addPrinter agrega una impresora válida, la persiste y usa el puerto por defecto", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });

    expect(printer.port).toBe(9100);
    expect(printer.protocol).toBe("tspl-bitmap");
    expect(usePrinterSettingsStore.getState().printers).toHaveLength(1);
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
  });

  it("addPrinter rechaza datos inválidos sin persistir nada", async () => {
    await expect(
      usePrinterSettingsStore
        .getState()
        .addPrinter({ name: "", host: "192.168.1.60" }),
    ).rejects.toBeInstanceOf(PrinterSettingsValidationError);

    expect(mockSetItemAsync).not.toHaveBeenCalled();
    expect(usePrinterSettingsStore.getState().printers).toEqual([]);
  });

  it("actualiza y persiste el protocolo de una impresora existente", async () => {
    const printer = await usePrinterSettingsStore.getState().addPrinter({
      name: "Taller",
      host: "192.168.1.60",
    });
    await usePrinterSettingsStore
      .getState()
      .updateProtocol(printer.id, "escpos-raster");
    await usePrinterSettingsStore
      .getState()
      .updateProtocol(printer.id, "tspl-bitmap");

    expect(usePrinterSettingsStore.getState().printers[0]?.protocol).toBe(
      "tspl-bitmap",
    );
    expect(JSON.parse(mockSetItemAsync.mock.calls.at(-1)![1])[0].protocol).toBe(
      "tspl-bitmap",
    );
  });

  it("removePrinter quita la impresora indicada y persiste el cambio", async () => {
    await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    const [existing] = usePrinterSettingsStore.getState().printers;

    await usePrinterSettingsStore.getState().removePrinter(existing!.id);

    expect(usePrinterSettingsStore.getState().printers).toEqual([]);
    expect(mockSetItemAsync).toHaveBeenCalledTimes(2);
  });
});
