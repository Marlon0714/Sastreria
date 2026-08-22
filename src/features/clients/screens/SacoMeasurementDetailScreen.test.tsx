import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import SacoMeasurementDetailScreen from "./SacoMeasurementDetailScreen";

import { useSacoMeasurement } from "../hooks/useSacoMeasurement";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertSaco = jest.fn();
const mockReload = jest.fn();
const mockValidate = jest.fn(() => ({}) as Record<string, unknown>);

jest.mock("../hooks/useSacoMeasurement", () => ({
  useSacoMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertSaco", () => ({
  useUpsertSaco: () => ({
    upsertSaco: mockUpsertSaco,
    isSubmitting: false,
    error: null,
    validate: mockValidate,
  }),
}));
const mockUseSaco = useSacoMeasurement as jest.Mock;

function buildProps(clientId = "client-1") {
  return {
    navigation: { navigate: mockNavigate, replace: mockReplace } as never,
    route: { params: { clientId } } as never,
  };
}

describe("SacoMeasurementDetailScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockReplace.mockReset();
    mockUpsertSaco.mockReset();
    mockReload.mockReset();
    mockValidate.mockReset();
    mockValidate.mockReturnValue({});
  });

  it("renders loading state", () => {
    mockUseSaco.mockReturnValue({
      measurement: null,
      isLoading: true,
      error: null,
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <SacoMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("starts in editing mode when no measurement exists", () => {
    mockUseSaco.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <SacoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Guardar medidas de saco")).toBeTruthy();
  });

  it("renders view mode with edit button and pre-filled data when measurement exists", () => {
    mockUseSaco.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", pechoAjustado: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <SacoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Editar medidas de saco")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();
  });

  it("shows edit form when pressing edit button", async () => {
    mockUseSaco.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", pechoAjustado: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <SacoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    fireEvent.press(getByLabelText("Editar medidas de saco"));
    await waitFor(() => {
      expect(getByLabelText("Guardar medidas de saco")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de saco")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUseSaco.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: "Sin conexión",
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <SacoMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Sin conexión")).toBeTruthy();
  });

  it("muestra el error de campo y no guarda cuando una medida está fuera de rango", async () => {
    mockUseSaco.mockReturnValue({
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
        <SacoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );

    fireEvent.changeText(getByLabelText("Espalda (cm)"), "500");
    fireEvent.press(getByLabelText("Guardar medidas de saco"));

    await waitFor(() => {
      expect(getByText("Número debe ser menor o igual a 300")).toBeTruthy();
    });
    expect(mockUpsertSaco).not.toHaveBeenCalled();
  });
});
