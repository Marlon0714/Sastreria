import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { ClientsDependencies } from "../domain/repository";
import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import CamisaMeasurementDetailScreen from "./CamisaMeasurementDetailScreen";

import { useCamisaMeasurement } from "../hooks/useCamisaMeasurement";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertCamisa = jest.fn();
const mockReload = jest.fn();
const mockDeleteCamisa = jest.fn<(clientId: string) => Promise<void>>();
const mockValidate = jest.fn(() => ({}) as Record<string, unknown>);

function buildDependencies(): ClientsDependencies {
  return {
    ...noopDependencies,
    measurementRepository: {
      ...noopDependencies.measurementRepository,
      deleteCamisa: (clientId: string) => mockDeleteCamisa(clientId),
    },
  };
}

jest.mock("../hooks/useCamisaMeasurement", () => ({
  useCamisaMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertCamisa", () => ({
  useUpsertCamisa: () => ({
    upsertCamisa: mockUpsertCamisa,
    isSubmitting: false,
    error: null,
    validate: mockValidate,
  }),
}));
const mockUseCamisa = useCamisaMeasurement as jest.Mock;

function buildProps(clientId = "client-1") {
  return {
    navigation: { navigate: mockNavigate, replace: mockReplace } as never,
    route: { params: { clientId } } as never,
  };
}

describe("CamisaMeasurementDetailScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockReplace.mockReset();
    mockUpsertCamisa.mockReset();
    mockReload.mockReset();
    mockDeleteCamisa.mockReset();
    mockValidate.mockReset();
    mockValidate.mockReturnValue({});
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading state", () => {
    mockUseCamisa.mockReturnValue({
      measurement: null,
      isLoading: true,
      error: null,
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("starts in editing mode when no measurement exists", () => {
    mockUseCamisa.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Guardar medidas de camisa")).toBeTruthy();
  });

  it("renders view mode with edit button when measurement exists", () => {
    mockUseCamisa.mockReturnValue({
      measurement: { id: "m-1", clientId: "c-1", pecho: 92, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Editar medidas de camisa")).toBeTruthy();
  });

  it("shows edit form when pressing edit button", async () => {
    mockUseCamisa.mockReturnValue({
      measurement: { id: "m-1", clientId: "c-1", pecho: 92, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
      </ClientsDependenciesProvider>,
    );
    fireEvent.press(getByLabelText("Editar medidas de camisa"));
    await waitFor(() => {
      expect(getByLabelText("Guardar medidas de camisa")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de camisa")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUseCamisa.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: "Error de red",
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Error de red")).toBeTruthy();
  });

  it("muestra el error de campo y no guarda cuando una medida está fuera de rango", async () => {
    mockUseCamisa.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    mockValidate.mockReturnValue({
      espalda: {
        type: "zod",
        message: "Número debe ser menor o igual a 300",
      },
    });

    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
      </ClientsDependenciesProvider>,
    );

    fireEvent.changeText(getByLabelText("Espalda (cm)"), "500");
    fireEvent.press(getByLabelText("Guardar medidas de camisa"));

    await waitFor(() => {
      expect(getByText("Número debe ser menor o igual a 300")).toBeTruthy();
    });
    expect(mockUpsertCamisa).not.toHaveBeenCalled();
  });

  describe("eliminar medida", () => {
    it("no muestra el botón de eliminar cuando no hay medida guardada", () => {
      mockUseCamisa.mockReturnValue({
        measurement: null,
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      const { queryByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
        </ClientsDependenciesProvider>,
      );
      expect(queryByLabelText("Eliminar medida de camisa")).toBeNull();
    });

    it("muestra el botón de eliminar cuando ya existe una medida guardada", () => {
      mockUseCamisa.mockReturnValue({
        measurement: { id: "m-1", clientId: "c-1", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
        </ClientsDependenciesProvider>,
      );
      expect(getByLabelText("Eliminar medida de camisa")).toBeTruthy();
    });

    it("al confirmar el Alert, elimina la medida y refresca la pantalla", async () => {
      mockUseCamisa.mockReturnValue({
        measurement: { id: "m-1", clientId: "c-1", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      mockDeleteCamisa.mockResolvedValueOnce(undefined);

      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de camisa"));

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
        expect(mockDeleteCamisa).toHaveBeenCalledWith("c-1");
        expect(mockReload).toHaveBeenCalledTimes(1);
      });
    });

    it("al cancelar el Alert, no elimina la medida", () => {
      mockUseCamisa.mockReturnValue({
        measurement: { id: "m-1", clientId: "c-1", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });

      const { getByLabelText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de camisa"));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = (alertCall?.[2] ?? []) as {
        text?: string;
        onPress?: () => void;
      }[];
      const cancelButton = buttons.find((b) => b.text === "Cancelar");
      expect(cancelButton?.onPress).toBeUndefined();

      expect(mockDeleteCamisa).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });

    it("muestra un error visible cuando falla la eliminación", async () => {
      mockUseCamisa.mockReturnValue({
        measurement: { id: "m-1", clientId: "c-1", notes: null },
        isLoading: false,
        error: null,
        reload: mockReload,
      });
      mockDeleteCamisa.mockRejectedValueOnce(new Error("disk full"));

      const { getByLabelText, getByText } = render(
        <ClientsDependenciesProvider dependencies={buildDependencies()}>
          <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
        </ClientsDependenciesProvider>,
      );

      fireEvent.press(getByLabelText("Eliminar medida de camisa"));

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
            "No se pudo eliminar la medida de camisa. Intenta nuevamente.",
          ),
        ).toBeTruthy();
      });
      expect(mockReload).not.toHaveBeenCalled();
    });
  });
});
