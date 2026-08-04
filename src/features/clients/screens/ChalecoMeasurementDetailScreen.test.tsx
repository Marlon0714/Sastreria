import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import ChalecoMeasurementDetailScreen from "./ChalecoMeasurementDetailScreen";

import { useChalecoMeasurement } from "../hooks/useChalecoMeasurement";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertChaleco = jest.fn();
const mockReload = jest.fn();

jest.mock("../hooks/useChalecoMeasurement", () => ({
  useChalecoMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertChaleco", () => ({
  useUpsertChaleco: () => ({
    upsertChaleco: mockUpsertChaleco,
    isSubmitting: false,
    error: null,
  }),
}));
const mockUseChaleco = useChalecoMeasurement as jest.Mock;

function buildProps(clientId = "client-1") {
  return {
    navigation: { navigate: mockNavigate, replace: mockReplace } as never,
    route: { params: { clientId } } as never,
  };
}

describe("ChalecoMeasurementDetailScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockReplace.mockReset();
    mockUpsertChaleco.mockReset();
    mockReload.mockReset();
  });

  it("renders loading state", () => {
    mockUseChaleco.mockReturnValue({
      measurement: null,
      isLoading: true,
      error: null,
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <ChalecoMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("starts in editing mode when no measurement exists", () => {
    mockUseChaleco.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <ChalecoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Guardar medidas de chaleco")).toBeTruthy();
  });

  it("renders view mode with edit button when measurement exists", () => {
    mockUseChaleco.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", largo: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <ChalecoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByLabelText("Editar medidas de chaleco")).toBeTruthy();
  });

  it("shows edit form when pressing edit button", async () => {
    mockUseChaleco.mockReturnValue({
      measurement: { id: "m-2", clientId: "c-2", largo: 100, notes: null },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <ChalecoMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    fireEvent.press(getByLabelText("Editar medidas de chaleco"));
    await waitFor(() => {
      expect(getByLabelText("Guardar medidas de chaleco")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de chaleco")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUseChaleco.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: "Sin conexión",
      reload: mockReload,
    });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <ChalecoMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Sin conexión")).toBeTruthy();
  });
});
