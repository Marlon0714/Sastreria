import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { ClientsDependencies } from "../domain/repository";
import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import PantalonMeasurementDetailScreen from "./PantalonMeasurementDetailScreen";

import { usePantalonMeasurement } from "../hooks/usePantalonMeasurement";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertPantalon = jest.fn();
const mockReload = jest.fn();
const mockDeletePantalon = jest.fn<(clientId: string) => Promise<void>>();
const mockValidate = jest.fn(() => ({}) as Record<string, unknown>);

function buildDependencies(): ClientsDependencies {
  return {
    ...noopDependencies,
    measurementRepository: {
      ...noopDependencies.measurementRepository,
      deletePantalon: (clientId: string) => mockDeletePantalon(clientId),
    },
  };
}

jest.mock("../hooks/usePantalonMeasurement", () => ({
  usePantalonMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertPantalon", () => ({
  useUpsertPantalon: () => ({
    upsertPantalon: mockUpsertPantalon,
    isSubmitting: false,
    error: null,
    validate: mockValidate,
  }),
}));
const mockUsePantalon = usePantalonMeasurement as jest.Mock;

function buildProps(clientId = "client-1") {
  return {
    navigation: { navigate: mockNavigate, replace: mockReplace } as never,
    route: { params: { clientId } } as never,
  };
}

describe("PantalonMeasurementDetailScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockReplace.mockReset();
    mockUpsertPantalon.mockReset();
    mockReload.mockReset();
    mockDeletePantalon.mockReset();
    mockValidate.mockReset();
    mockValidate.mockReturnValue({});
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading state", () => {
    mockUsePantalon.mockReturnValue({
      measurement: null,
      isLoading: true,
      error: null,
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("starts in editing mode when no measurement exists", () => {
    mockUsePantalon.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Guardar medidas de pantalón")).toBeTruthy();
  });

  it("renders view mode with edit button when measurement exists", () => {
    mockUsePantalon.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", largo: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Editar medidas de pantalón")).toBeTruthy();
  });

  it("shows edit form when pressing edit button", async () => {
    mockUsePantalon.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", largo: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    fireEvent.press(getByLabelText("Editar medidas de pantalón"));
    await waitFor(() => {
      expect(getByLabelText("Guardar medidas de pantalón")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de pantalón")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUsePantalon.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: "Sin conexión",
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Sin conexión")).toBeTruthy();
  });

  it("muestra el error de campo y no guarda cuando una medida está fuera de rango", async () => {
    mockUsePantalon.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    mockValidate.mockReturnValue({
      largo: {
        type: "zod",
        message: "Número debe ser menor o igual a 300",
      },
    });

    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );

    fireEvent.changeText(getByLabelText("Largo (cm)"), "500");
    fireEvent.press(getByLabelText("Guardar medidas de pantalón"));

    await waitFor(() => {
      expect(getByText("Número debe ser menor o igual a 300")).toBeTruthy();
    });
    expect(mockUpsertPantalon).not.toHaveBeenCalled();
  });

  describe("eliminar medida", () => {
    it("no muestra el botón de eliminar cuando no hay medida guardada", () => {
      mockUsePantalon.mockReturnValue({
        measurement: null,
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      const { queryByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
        </ClientsDependenciesProvider>,
      );
      expect(queryByLabelText("Eliminar medida de pantalón")).toBeNull();
    });

    it("muestra el botón de eliminar cuando ya existe una medida guardada", () => {
      mockUsePantalon.mockReturnValue({
        measurement: { id: "m-2", clientId: "c-2", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
        </ClientsDependenciesProvider>,
      );
      expect(getByLabelText("Eliminar medida de pantalón")).toBeTruthy();
    });

    it("al confirmar el Alert, elimina la medida y refresca la pantalla", async () => {
      mockUsePantalon.mockReturnValue({
        measurement: { id: "m-2", clientId: "c-2", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      mockDeletePantalon.mockResolvedValueOnce(undefined);

      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de pantalón"));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      expect(alertCall?.[0]).toBe("Eliminar medida");
      const buttons = (alertCall?.[2] ?? []) as {
        text?: string;
        onPress?: () => void;
      }[];
      const confirmButton = buttons.find((b) => b.text === "Eliminar");
      expect(confirmButton).toBeDefined();

      confirmButton?.onPress?.();

      await waitFor(() => {
        expect(mockDeletePantalon).toHaveBeenCalledWith("c-2");
        expect(mockReload).toHaveBeenCalledTimes(1);
      });
    });

    it("al cancelar el Alert, no elimina la medida", () => {
      mockUsePantalon.mockReturnValue({
        measurement: { id: "m-2", clientId: "c-2", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });

      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de pantalón"));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = (alertCall?.[2] ?? []) as {
        text?: string;
        onPress?: () => void;
      }[];
      const cancelButton = buttons.find((b) => b.text === "Cancelar");
      expect(cancelButton?.onPress).toBeUndefined();

      expect(mockDeletePantalon).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });

    it("muestra un error visible cuando falla la eliminación", async () => {
      mockUsePantalon.mockReturnValue({
        measurement: { id: "m-2", clientId: "c-2", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      mockDeletePantalon.mockRejectedValueOnce(new Error("disk full"));

      const { getByLabelText, getByText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de pantalón"));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = (alertCall?.[2] ?? []) as {
        text?: string;
        onPress?: () => void;
      }[];
      const confirmButton = buttons.find((b) => b.text === "Eliminar");
      confirmButton?.onPress?.();

      await waitFor(() => {
        expect(
          getByText(
            "No se pudo eliminar la medida de pantalón. Intenta nuevamente.",
          ),
        ).toBeTruthy();
      });
      expect(mockReload).not.toHaveBeenCalled();
    });
  });
});
