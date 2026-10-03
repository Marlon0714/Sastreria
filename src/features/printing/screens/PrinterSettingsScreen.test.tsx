import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import type { PrintingDependencies } from "../domain/repository";
import { PrintingDependenciesProvider } from "../hooks/PrintingDependenciesProvider";
import { noopPrintingDependencies } from "../hooks/PrintingDependenciesProvider.test-utils";
import PrinterSettingsScreen from "./PrinterSettingsScreen";

const mockSetItemAsync =
  jest.fn<(key: string, value: string) => Promise<void>>();
jest.mock("expo-crypto", () => ({
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: (key: string, value: string) => mockSetItemAsync(key, value),
}));
jest.mock("../hooks/useArregloLabelCapture", () => ({
  useArregloLabelCapture: () => ({
    viewRef: { current: null },
    onLayout: jest.fn(),
    capture: async () => ({ base64Png: "fake", width: 8, height: 1 }),
  }),
}));

function renderScreen(overrides: Partial<PrintingDependencies> = {}) {
  return render(
    <PrintingDependenciesProvider
      dependencies={{ ...noopPrintingDependencies, ...overrides }}
    >
      <PrinterSettingsScreen />
    </PrintingDependenciesProvider>,
  );
}

async function configuredPrinter() {
  return usePrinterSettingsStore
    .getState()
    .addPrinter({ name: "Taller", host: "192.168.1.60" });
}

describe("PrinterSettingsScreen", () => {
  beforeEach(() => {
    mockSetItemAsync.mockReset().mockResolvedValue();
    usePrinterSettingsStore.setState({ printers: [], defaultPrinterId: null });
    useIdentityStore
      .getState()
      .setOwnProfile({
        id: "owner-1",
        displayName: "Dueño",
        role: "owner",
        isSharedDevice: false,
      });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("muestra el estado vacío", () => {
    expect(
      renderScreen().getByText("Sin impresoras configuradas"),
    ).toBeTruthy();
  });

  it("agrega una impresora desde el formulario y la establece como predeterminada", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Agregar impresora"));
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre de la impresora")).toBeTruthy(),
    );
    fireEvent.changeText(
      screen.getByLabelText("Nombre de la impresora"),
      "Mostrador",
    );
    fireEvent.changeText(
      screen.getByLabelText("Dirección IP de la impresora"),
      "192.168.1.50",
    );
    fireEvent.press(screen.getByLabelText("Guardar impresora"));
    await waitFor(() =>
      expect(screen.getByText("192.168.1.50:9100")).toBeTruthy(),
    );
    expect(
      screen.getByLabelText("Predeterminada Mostrador").props.accessibilityState
        .checked,
    ).toBe(true);
  });

  it("muestra validación inline sin guardar un nombre vacío", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Agregar impresora"));
    await waitFor(() =>
      expect(screen.getByLabelText("Guardar impresora")).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText("Guardar impresora"));
    await waitFor(() =>
      expect(screen.getByText("El nombre es obligatorio")).toBeTruthy(),
    );
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it("edita protocolo y tamaño sin recrear la impresora", async () => {
    const printer = await configuredPrinter();
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Editar Taller"));
    await waitFor(() =>
      expect(screen.getByLabelText("Ajustes avanzados")).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText("Ajustes avanzados"));
    fireEvent.press(screen.getByLabelText("Protocolo ESC/POS"));
    fireEvent.changeText(screen.getByLabelText("Ancho de etiqueta (mm)"), "60");
    fireEvent.press(screen.getByLabelText("Guardar impresora"));
    await waitFor(() =>
      expect(usePrinterSettingsStore.getState().printers[0]?.protocol).toBe(
        "escpos-raster",
      ),
    );
    expect(usePrinterSettingsStore.getState().printers[0]).toMatchObject({
      id: printer.id,
      labelWidthMm: 60,
    });
  });

  it("la prueba usa TSPL configurado y reporta enviado, no impreso", async () => {
    await configuredPrinter();
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () => {});
    const screen = renderScreen({ labelPrinterRepository: { printLabelJob } });
    fireEvent.press(screen.getByLabelText("Imprimir prueba en Taller"));
    await waitFor(() =>
      expect(screen.getByText("Prueba enviada")).toBeTruthy(),
    );
    const job = printLabelJob.mock.calls[0]![1];
    expect(String.fromCharCode(...job.slice(0, 5))).toBe("SIZE ");
    expect(screen.queryByText("Impreso")).toBeNull();
  });

  it("permite al operario recuperación y predeterminada pero no administración", async () => {
    await configuredPrinter();
    useIdentityStore
      .getState()
      .setOwnProfile({
        id: "worker-1",
        displayName: "Operario",
        role: "operario",
        isSharedDevice: false,
      });
    const screen = renderScreen();
    expect(screen.queryByLabelText("Agregar impresora")).toBeNull();
    expect(screen.queryByLabelText("Editar Taller")).toBeNull();
    expect(screen.queryByLabelText("Eliminar Taller")).toBeNull();
    expect(screen.getByLabelText("Predeterminada Taller")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Resolver conexión de Taller"));
    expect(screen.getByLabelText("Nueva IP de la impresora")).toBeTruthy();
    expect(screen.queryByLabelText("Ancho de etiqueta (mm)")).toBeNull();
  });

  it("no guarda la IP nueva hasta enviar y confirmar la prueba", async () => {
    await configuredPrinter();
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () => {});
    const screen = renderScreen({ labelPrinterRepository: { printLabelJob } });
    fireEvent.press(screen.getByLabelText("Resolver conexión de Taller"));
    fireEvent.changeText(
      screen.getByLabelText("Nueva IP de la impresora"),
      "192.168.1.77",
    );
    expect(
      screen.queryByLabelText("Confirmar impresora encontrada"),
    ).toBeNull();
    fireEvent.press(screen.getByLabelText("Probar nueva conexión"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Confirmar impresora encontrada"),
      ).toBeTruthy(),
    );
    expect(printLabelJob.mock.calls[0]![0].host).toBe("192.168.1.77");
    expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
      "192.168.1.60",
    );
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        buttons
          ?.find((button) => button.text === "Sí, guardar IP")
          ?.onPress?.();
      });
    fireEvent.press(screen.getByLabelText("Confirmar impresora encontrada"));
    await waitFor(() =>
      expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
        "192.168.1.77",
      ),
    );
  });

  it("no confirma una conexión cuando falla el envío", async () => {
    await configuredPrinter();
    const printLabelJob = jest.fn<
      PrintingDependencies["labelPrinterRepository"]["printLabelJob"]
    >(async () => {
      throw new Error("socket");
    });
    const screen = renderScreen({ labelPrinterRepository: { printLabelJob } });
    fireEvent.press(screen.getByLabelText("Resolver conexión de Taller"));
    fireEvent.changeText(
      screen.getByLabelText("Nueva IP de la impresora"),
      "192.168.1.77",
    );
    fireEvent.press(screen.getByLabelText("Probar nueva conexión"));
    await waitFor(() =>
      expect(screen.getByText(/No se pudo completar/)).toBeTruthy(),
    );
    expect(
      screen.queryByLabelText("Confirmar impresora encontrada"),
    ).toBeNull();
    expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
      "192.168.1.60",
    );
  });

  it("elimina tras confirmación", async () => {
    await configuredPrinter();
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Eliminar Taller"));
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
    expect(buttons?.find((button) => button.text === "Eliminar")).toBeTruthy();
    await act(async () => {
      buttons?.find((button) => button.text === "Eliminar")?.onPress?.();
    });
    await waitFor(() =>
      expect(usePrinterSettingsStore.getState().printers).toHaveLength(0),
    );
    expect(screen.queryByText("Taller")).toBeNull();
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBeNull();
  });

  it("descubre y precarga una IP sin crear impresora", async () => {
    const screen = renderScreen({
      getLocalNetworkInfo: async () => ({
        ipAddress: "192.168.1.34",
        subnetMask: "255.255.255.0",
      }),
      printerDiscoveryRepository: { scanPort: async () => ["192.168.1.77"] },
    });
    fireEvent.press(screen.getByLabelText("Agregar impresora"));
    await waitFor(() =>
      expect(screen.getByLabelText("Buscar impresoras en la red")).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText("Buscar impresoras en la red"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Usar impresora encontrada en 192.168.1.77"),
      ).toBeTruthy(),
    );
    fireEvent.press(
      screen.getByLabelText("Usar impresora encontrada en 192.168.1.77"),
    );
    expect(
      screen.getByLabelText("Dirección IP de la impresora").props.value,
    ).toBe("192.168.1.77");
    expect(usePrinterSettingsStore.getState().printers).toHaveLength(0);
  });

  it("la vista previa de prueba no contiene datos de clientes", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Ver diseño de etiqueta"));
    expect(screen.getByText("Vista previa de etiqueta")).toBeTruthy();
    expect(screen.getAllByText("PRUEBA DE IMPRESION").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/Tel\./)).toBeNull();
    fireEvent.press(screen.getByLabelText("Cerrar"));
    await waitFor(() =>
      expect(screen.queryByText("Vista previa de etiqueta")).toBeNull(),
    );
  });
});
