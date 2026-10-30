import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { ClientsDependencies } from "../../clients/domain/repository";
import type { Client } from "../../clients/domain/types";
import { ClientsDependenciesProvider } from "../../clients/hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../../clients/hooks/ClientsDependenciesProvider.test-utils";
import type { Schedule } from "../../schedule/domain/types";
import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import type { PrinterTarget } from "../domain/types";
import { PrintArregloLabelButton } from "./PrintArregloLabelButton";

const mockCapture = jest.fn(async () =>
  Promise.resolve({ base64Png: "fake", width: 8, height: 1 }),
);
const mockPrintLabel = jest.fn(async () => Promise.resolve());
let mockIsPrinting = false;

jest.mock("../hooks/useArregloLabelCapture", () => ({
  useArregloLabelCapture: () => ({
    viewRef: { current: null },
    onLayout: jest.fn(),
    capture: mockCapture,
  }),
}));

jest.mock("../hooks/usePrintArregloLabel", () => ({
  usePrintArregloLabel: () => ({
    isPrinting: mockIsPrinting,
    printLabel: mockPrintLabel,
  }),
}));

const mockFindById = jest.fn<(id: string) => Promise<Client | null>>();

function buildDependencies(): ClientsDependencies {
  return {
    ...noopDependencies,
    clientRepository: {
      ...noopDependencies.clientRepository,
      findById: (id: string) => mockFindById(id),
    },
  };
}

const printerA: PrinterTarget = {
  id: "printer-a",
  name: "Mostrador",
  host: "192.168.1.50",
  port: 9100,
};
const printerB: PrinterTarget = {
  id: "printer-b",
  name: "Taller",
  host: "192.168.1.60",
  port: 9100,
};

const arregloSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const confeccionSchedule: Schedule = {
  ...arregloSchedule,
  category: "confeccion",
};

function renderButton(props: {
  schedule: Schedule;
  client?: Client | null;
  requestPrint?: string;
  onPrintFlowEnd?: () => void;
}) {
  return render(
    <ClientsDependenciesProvider dependencies={buildDependencies()}>
      <PrintArregloLabelButton {...props} />
    </ClientsDependenciesProvider>,
  );
}

describe("PrintArregloLabelButton", () => {
  beforeEach(() => {
    mockCapture.mockClear();
    mockPrintLabel.mockClear();
    mockPrintLabel.mockResolvedValue(undefined);
    mockFindById.mockReset();
    mockFindById.mockResolvedValue(null);
    mockIsPrinting = false;
    usePrinterSettingsStore.setState({
      printers: [],
      defaultPrinterId: null,
      isHydrating: false,
      hydrate: async () => {},
    });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("no renderiza nada para un turno de categoría 'confeccion'", () => {
    const { queryByLabelText } = renderButton({
      schedule: confeccionSchedule,
      client: null,
    });

    expect(queryByLabelText("Imprimir etiqueta")).toBeNull();
  });

  it("avisa que no hay impresoras configuradas si la lista está vacía", () => {
    const { getByLabelText } = renderButton({
      schedule: arregloSchedule,
      client: {
        id: "client-1",
        firstName: "Ana",
        lastName: "Torres",
        phone: "300",
        notes: null,
        measurements: [],
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
        syncStatus: "pending",
      },
    });

    fireEvent.press(getByLabelText("Imprimir etiqueta"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "No hay impresoras configuradas",
      expect.stringContaining("Impresoras"),
      undefined,
    );
    expect(mockPrintLabel).not.toHaveBeenCalled();
  });

  it("muestra la vista previa y solo imprime al confirmar cuando hay una sola impresora configurada", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    const onPrintFlowEnd = jest.fn();
    const { getByLabelText } = renderButton({
      schedule: arregloSchedule,
      client: {
        id: "client-1",
        firstName: "Ana",
        lastName: "Torres",
        phone: "300",
        notes: null,
        measurements: [],
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
        syncStatus: "pending",
      },
      onPrintFlowEnd,
    });

    fireEvent.press(getByLabelText("Imprimir etiqueta"));

    expect(getByLabelText("Confirmar impresión")).toBeTruthy();
    expect(mockPrintLabel).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText("Confirmar impresión"));

    await waitFor(() => {
      expect(mockPrintLabel).toHaveBeenCalledTimes(1);
    });
    expect(mockPrintLabel).toHaveBeenCalledWith(
      expect.objectContaining({ target: printerA, capture: mockCapture }),
    );
    expect(onPrintFlowEnd).toHaveBeenCalledTimes(1);
  });

  it("permite previsualizar e imprimir la etiqueta con fondo negro y texto blanco", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    const { getByLabelText } = renderButton({
      schedule: arregloSchedule,
      client: null,
    });

    fireEvent.press(getByLabelText("Imprimir etiqueta"));
    fireEvent(getByLabelText("Probar fondo negro"), "valueChange", true);
    fireEvent.press(getByLabelText("Confirmar impresión"));

    await waitFor(() => {
      expect(mockPrintLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          target: printerA,
          invertColors: true,
        }),
      );
    });
  });

  it("pregunta cuál impresora usar cuando hay más de una configurada", () => {
    usePrinterSettingsStore.setState({ printers: [printerA, printerB] });
    const { getByLabelText } = renderButton({
      schedule: arregloSchedule,
      client: null,
    });

    fireEvent.press(getByLabelText("Imprimir etiqueta"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Elegir impresora",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: "Mostrador" }),
        expect.objectContaining({ text: "Taller" }),
      ]),
    );
    expect(mockPrintLabel).not.toHaveBeenCalled();
  });

  it("abre la vista previa al pedir impresión inmediatamente después del guardado", () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    const screen = renderButton({
      schedule: arregloSchedule,
      client: null,
      requestPrint: arregloSchedule.id,
    });

    expect(screen.getByLabelText("Confirmar impresión")).toBeTruthy();
    expect(screen.getByText("Se enviará a: Mostrador")).toBeTruthy();
    expect(mockPrintLabel).not.toHaveBeenCalled();
  });

  it("preselecciona la predeterminada y permite cambiar solo para este trabajo", async () => {
    usePrinterSettingsStore.setState({
      printers: [printerA, printerB],
      defaultPrinterId: printerB.id,
    });
    const screen = renderButton({ schedule: arregloSchedule, client: null });
    fireEvent.press(screen.getByLabelText("Imprimir etiqueta"));
    expect(screen.getByText("Se enviará a: Taller")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Cambiar impresora"));
    const choices = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
    act(() => {
      choices?.find((choice) => choice.text === "Mostrador")?.onPress?.();
    });
    expect(screen.getByText("Se enviará a: Mostrador")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Confirmar impresión"));
    await waitFor(() =>
      expect(mockPrintLabel).toHaveBeenCalledWith(
        expect.objectContaining({ target: printerA }),
      ),
    );
    expect(choices?.find((choice) => choice.text === "Mostrador")).toBeTruthy();
    expect(usePrinterSettingsStore.getState().defaultPrinterId).toBe(
      printerB.id,
    );
  });

  it("resuelve el cliente por su cuenta cuando no se le pasa la prop client", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    mockFindById.mockResolvedValue({
      id: "client-1",
      firstName: "Bruno",
      lastName: "Diaz",
      phone: "3009999999",
      notes: null,
      measurements: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      syncStatus: "pending",
    });

    renderButton({ schedule: arregloSchedule });

    await waitFor(() => {
      expect(mockFindById).toHaveBeenCalledWith("client-1");
    });
  });

  it("muestra el error de conexión en la vista previa y permite reintentar", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    const onPrintFlowEnd = jest.fn();
    mockPrintLabel.mockRejectedValueOnce(
      new Error(
        "La impresora rechazó la conexión en 192.168.1.50:9100. Verifica su IP y puerto de impresión.",
      ),
    );
    const { getByLabelText, findByText } = renderButton({
      schedule: arregloSchedule,
      client: null,
      onPrintFlowEnd,
    });
    jest.mocked(Alert.alert).mockClear();

    fireEvent.press(getByLabelText("Imprimir etiqueta"));
    fireEvent.press(getByLabelText("Confirmar impresión"));

    expect(await findByText("No se pudo imprimir")).toBeTruthy();
    expect(await findByText(/192\.168\.1\.50:9100/)).toBeTruthy();
    expect(await findByText(/IP y puerto estén actualizados/)).toBeTruthy();
    expect(getByLabelText("Confirmar impresión")).toBeTruthy();
    expect(mockPrintLabel).toHaveBeenCalledTimes(1);
    expect(onPrintFlowEnd).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText("Confirmar impresión"));

    await waitFor(() => {
      expect(mockPrintLabel).toHaveBeenCalledTimes(2);
      expect(onPrintFlowEnd).toHaveBeenCalledTimes(1);
    });
  });

  it("vuelve a agenda si el usuario abandona la impresión automática tras un fallo", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    mockPrintLabel.mockRejectedValueOnce(
      new Error("No se pudo conectar con la impresora"),
    );
    const onPrintFlowEnd = jest.fn();
    const { getByLabelText, findByText } = renderButton({
      schedule: arregloSchedule,
      client: null,
      requestPrint: arregloSchedule.id,
      onPrintFlowEnd,
    });

    fireEvent.press(getByLabelText("Confirmar impresión"));

    expect(
      await findByText(/No se pudo conectar con la impresora/),
    ).toBeTruthy();
    fireEvent.press(getByLabelText("Cancelar"));

    expect(onPrintFlowEnd).toHaveBeenCalledTimes(1);
  });

  it("limita a tres intentos y desactiva impresión hasta iniciar un flujo nuevo", async () => {
    usePrinterSettingsStore.setState({ printers: [printerA] });
    mockPrintLabel.mockRejectedValue(new Error("Conexión agotada"));
    const { getByLabelText, findByText } = renderButton({
      schedule: arregloSchedule,
      client: null,
    });

    fireEvent.press(getByLabelText("Imprimir etiqueta"));
    fireEvent.press(getByLabelText("Confirmar impresión"));

    await findByText(/Intento 1 de 3/);
    fireEvent.press(getByLabelText("Confirmar impresión"));
    await findByText(/Intento 2 de 3/);
    fireEvent.press(getByLabelText("Confirmar impresión"));
    await findByText(/Intento 3 de 3/);

    expect(mockPrintLabel).toHaveBeenCalledTimes(3);
    expect(
      getByLabelText("Confirmar impresión").props.accessibilityState.disabled,
    ).toBe(true);
    expect(getByLabelText("Confirmar impresión")).toHaveTextContent(
      "Límite alcanzado",
    );
  });
});
