import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useIdentityStore } from "./identityStore";

import {
  PrinterSettingsValidationError,
  usePrinterSettingsStore,
} from "./printerSettingsStore";

const mockGetItemAsync = jest.fn<(key: string) => Promise<string | null>>();
let mockNextUuid = 0;
jest.mock("expo-crypto", () => ({
  randomUUID: () =>
    `11111111-1111-4111-8111-${String(++mockNextUuid).padStart(12, "0")}`,
}));
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
    mockNextUuid = 0;
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue();
    usePrinterSettingsStore.setState({ printers: [], defaultPrinterId: null });
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });
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
    expect(
      JSON.parse(mockSetItemAsync.mock.calls.at(-1)![1]).printers[0].protocol,
    ).toBe("tspl-bitmap");
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

  it("migra la lista anterior sin perder impresoras y elige la primera como predeterminada", async () => {
    mockGetItemAsync.mockResolvedValue(
      JSON.stringify([
        { id: "p1", name: "Taller", host: "192.168.1.60", port: 9100 },
      ]),
    );
    await usePrinterSettingsStore.getState().hydrate();
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBe("p1");
  });

  it("permite al operario elegir predeterminada pero no administrar", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    useIdentityStore.getState().setOwnProfile({
      id: "worker-1",
      displayName: "Operario",
      role: "operario",
      isSharedDevice: false,
    });
    await usePrinterSettingsStore.getState().setDefaultPrinter(printer.id);
    await expect(
      usePrinterSettingsStore.getState().removePrinter(printer.id),
    ).rejects.toThrow(/permiso/);
    await expect(
      usePrinterSettingsStore
        .getState()
        .updateProtocol(printer.id, "escpos-raster"),
    ).rejects.toThrow(/permiso/);
    await expect(
      usePrinterSettingsStore
        .getState()
        .addPrinter({ name: "Otra", host: "192.168.1.61" }),
    ).rejects.toThrow(/permiso/);
  });

  it("no hereda permisos del dueño en un dispositivo compartido", async () => {
    useIdentityStore.getState().setOwnProfile({
      id: "shared-1",
      displayName: "Taller",
      role: "owner",
      isSharedDevice: true,
    });
    await expect(
      usePrinterSettingsStore
        .getState()
        .addPrinter({ name: "Taller", host: "192.168.1.60" }),
    ).rejects.toThrow(/permiso/);
    useIdentityStore.getState().setResolvedActor({
      id: "worker-1",
      displayName: "Operario",
      role: "operario",
      isSharedDevice: false,
    });
    await expect(
      usePrinterSettingsStore
        .getState()
        .addPrinter({ name: "Taller", host: "192.168.1.60" }),
    ).rejects.toThrow(/permiso/);
  });

  it("restaura la predeterminada elegida y no cambia al alternar usuarios", async () => {
    const first = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Uno", host: "192.168.1.60" });
    const second = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Dos", host: "192.168.1.61" });
    await usePrinterSettingsStore.getState().setDefaultPrinter(second.id);
    const stored = mockSetItemAsync.mock.calls.at(-1)![1];
    usePrinterSettingsStore.setState({ printers: [], defaultPrinterId: null });
    mockGetItemAsync.mockResolvedValue(stored);
    await usePrinterSettingsStore.getState().hydrate();
    useIdentityStore.getState().setOwnProfile({
      id: "worker-1",
      displayName: "Operario",
      role: "operario",
      isSharedDevice: false,
    });
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBe(second.id);
    expect(
      usePrinterSettingsStore.getState().printers.map((printer) => printer.id),
    ).toEqual([first.id, second.id]);
  });

  it("elige otra predeterminada al eliminar la actual", async () => {
    const first = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Uno", host: "192.168.1.60" });
    const second = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Dos", host: "192.168.1.61" });
    await usePrinterSettingsStore.getState().removePrinter(first.id);
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBe(second.id);
  });

  it("no cambia preferencias ni configuración si el almacenamiento falla", async () => {
    const first = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Uno", host: "192.168.1.60" });
    const second = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Dos", host: "192.168.1.61" });
    mockSetItemAsync.mockRejectedValue(new Error("storage"));
    await expect(
      usePrinterSettingsStore.getState().setDefaultPrinter(second.id),
    ).rejects.toThrow("storage");
    await expect(
      usePrinterSettingsStore
        .getState()
        .updateConnection(first.id, "192.168.1.77"),
    ).rejects.toThrow("storage");
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBe(first.id);
    expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
      first.host,
    );
  });

  it("permite al operario actualizar solo la IP pero no tamaño ni protocolo", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    useIdentityStore.getState().setOwnProfile({
      id: "worker-1",
      displayName: "Operario",
      role: "operario",
      isSharedDevice: false,
    });
    await usePrinterSettingsStore
      .getState()
      .updateConnection(printer.id, "192.168.1.77");
    await expect(
      usePrinterSettingsStore
        .getState()
        .updatePrinter(printer.id, { ...printer, labelWidthMm: 60 }),
    ).rejects.toThrow(/permiso/);
    expect(usePrinterSettingsStore.getState().printers[0]).toEqual({
      ...printer,
      host: "192.168.1.77",
    });
  });

  it("rechaza la IP externa y una predeterminada inexistente", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    await expect(
      usePrinterSettingsStore
        .getState()
        .updateConnection(printer.id, "8.8.8.8"),
    ).rejects.toThrow(/red local/);
    await expect(
      usePrinterSettingsStore.getState().setDefaultPrinter("missing"),
    ).rejects.toThrow(/ya no/);
  });
});
