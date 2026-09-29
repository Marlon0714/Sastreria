import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor, type RenderAPI } from "@testing-library/react-native";
import { Alert } from "react-native";

import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import type { PrintingDependencies } from "../domain/repository";
import { PrintingDependenciesProvider } from "../hooks/PrintingDependenciesProvider";
import { noopPrintingDependencies } from "../hooks/PrintingDependenciesProvider.test-utils";
import PrinterSettingsScreen from "./PrinterSettingsScreen";

const mockSetItemAsync = jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => Promise.resolve(null)),
  setItemAsync: (key: string, value: string): Promise<void> => mockSetItemAsync(key, value),
}));

function renderScreen(overrides: Partial<PrintingDependencies> = {}): RenderAPI {
  const dependencies: PrintingDependencies = { ...noopPrintingDependencies, ...overrides };

  return render(
    <PrintingDependenciesProvider dependencies={dependencies}>
      <PrinterSettingsScreen />
    </PrintingDependenciesProvider>,
  );
}

describe("PrinterSettingsScreen", () => {
  beforeEach(() => {
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue();
    usePrinterSettingsStore.setState({ printers: [] });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("muestra el estado vacío cuando no hay impresoras configuradas", () => {
    const { getByText } = renderScreen();

    expect(getByText("Sin impresoras configuradas")).toBeTruthy();
  });

  it("agrega una impresora válida y la muestra en la lista", async () => {
    const { getByLabelText, getByText } = renderScreen();

    fireEvent.changeText(getByLabelText("Nombre de la impresora"), "Mostrador");
    fireEvent.changeText(getByLabelText("Dirección IP de la impresora"), "192.168.1.50");
    fireEvent.press(getByLabelText("Guardar impresora"));

    await waitFor(() => {
      expect(getByText("Mostrador")).toBeTruthy();
    });
    expect(getByText("192.168.1.50:9100")).toBeTruthy();
    expect(usePrinterSettingsStore.getState().printers).toHaveLength(1);
  });

  it("muestra un error y no agrega nada si el nombre está vacío", async () => {
    const { getByLabelText } = renderScreen();

    fireEvent.changeText(getByLabelText("Dirección IP de la impresora"), "192.168.1.50");
    fireEvent.press(getByLabelText("Guardar impresora"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "No se pudo guardar",
        expect.any(String),
      );
    });
    expect(usePrinterSettingsStore.getState().printers).toHaveLength(0);
  });

  it("elimina una impresora tras confirmar en el Alert", async () => {
    await usePrinterSettingsStore.getState().addPrinter({ name: "Taller", host: "192.168.1.60" });

    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === "Eliminar");
      confirmButton?.onPress?.();
    });

    const { getByLabelText, queryByText } = renderScreen();

    fireEvent.press(getByLabelText("Eliminar Taller"));

    await waitFor(() => {
      expect(queryByText("Taller")).toBeNull();
    });
    expect(usePrinterSettingsStore.getState().printers).toHaveLength(0);
  });

  it("muestra y cierra la vista previa de etiqueta de ejemplo", async () => {
    const { getByLabelText, getByText, queryByText } = renderScreen();

    fireEvent.press(getByLabelText("Ver diseño de etiqueta"));

    expect(getByText("Vista previa de etiqueta")).toBeTruthy();
    expect(getByText("Ana Torres")).toBeTruthy();

    fireEvent.press(getByLabelText("Cerrar"));

    await waitFor(() => {
      expect(queryByText("Vista previa de etiqueta")).toBeNull();
    });
  });

  describe("Buscar en la red", () => {
    it("escanea la red y lista los hosts encontrados como filas tocables", async () => {
      const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
        Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
      );
      const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
        async () => Promise.resolve(["192.168.1.77"]),
      );

      const { getByLabelText, getByText } = renderScreen({
        getLocalNetworkInfo,
        printerDiscoveryRepository: { scanPort },
      });

      fireEvent.press(getByLabelText("Buscar impresoras en la red"));

      await waitFor(() => {
        expect(getByText("192.168.1.77")).toBeTruthy();
      });
      expect(getLocalNetworkInfo).toHaveBeenCalledTimes(1);
      expect(scanPort).toHaveBeenCalledTimes(1);
    });

    it("precarga host y puerto del formulario al tocar un resultado, sin crear la impresora", async () => {
      const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
        Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
      );
      const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
        async () => Promise.resolve(["192.168.1.77"]),
      );

      const { getByLabelText, getByText } = renderScreen({
        getLocalNetworkInfo,
        printerDiscoveryRepository: { scanPort },
      });

      fireEvent.press(getByLabelText("Buscar impresoras en la red"));

      await waitFor(() => {
        expect(getByText("192.168.1.77")).toBeTruthy();
      });

      fireEvent.press(getByLabelText("Usar impresora encontrada en 192.168.1.77"));

      expect(getByLabelText("Dirección IP de la impresora").props.value).toBe("192.168.1.77");
      expect(getByLabelText("Puerto de la impresora").props.value).toBe("9100");
      expect(usePrinterSettingsStore.getState().printers).toHaveLength(0);
    });

    it("muestra el mensaje de error cuando no hay red soportada", async () => {
      const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
        Promise.resolve(null),
      );
      const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
        async () => Promise.resolve([]),
      );

      const { getByLabelText, getByText } = renderScreen({
        getLocalNetworkInfo,
        printerDiscoveryRepository: { scanPort },
      });

      fireEvent.press(getByLabelText("Buscar impresoras en la red"));

      await waitFor(() => {
        expect(getByText(/no se detectó una red wifi/i)).toBeTruthy();
      });
      expect(scanPort).not.toHaveBeenCalled();
    });

    it("muestra un aviso cuando el escaneo no encuentra ninguna impresora", async () => {
      const getLocalNetworkInfo = jest.fn<PrintingDependencies["getLocalNetworkInfo"]>(async () =>
        Promise.resolve({ ipAddress: "192.168.1.34", subnetMask: "255.255.255.0" }),
      );
      const scanPort = jest.fn<PrintingDependencies["printerDiscoveryRepository"]["scanPort"]>(
        async () => Promise.resolve([]),
      );

      const { getByLabelText, getByText } = renderScreen({
        getLocalNetworkInfo,
        printerDiscoveryRepository: { scanPort },
      });

      fireEvent.press(getByLabelText("Buscar impresoras en la red"));

      await waitFor(() => {
        expect(getByText("No se encontraron impresoras en la red.")).toBeTruthy();
      });
    });
  });
});
