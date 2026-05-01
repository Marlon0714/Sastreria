import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import PantalonMeasurementDetailScreen from "./PantalonMeasurementDetailScreen";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertPantalon = jest.fn();
const mockReload = jest.fn();

jest.mock("../hooks/usePantalonMeasurement", () => ({
  usePantalonMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertPantalon", () => ({
  useUpsertPantalon: () => ({
    upsertPantalon: mockUpsertPantalon,
    isSubmitting: false,
    error: null,
  }),
}));

import { usePantalonMeasurement } from "../hooks/usePantalonMeasurement";
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
  });

  it("renders loading state", () => {
    mockUsePantalon.mockReturnValue({ measurement: null, isLoading: true, error: null, reload: mockReload });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("renders empty state with add button when no measurement exists", () => {
    mockUsePantalon.mockReturnValue({ measurement: null, isLoading: false, error: null, reload: mockReload });
    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps("c-2")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText(/no hay medidas de pantalón/i)).toBeTruthy();
    fireEvent.press(getByLabelText("Agregar medidas de pantalón"));
    expect(mockReplace).toHaveBeenCalledWith("PantalonMeasurementCreate", { clientId: "c-2" });
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
      expect(getByLabelText("Guardar cambios de pantalón")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de pantalón")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUsePantalon.mockReturnValue({ measurement: null, isLoading: false, error: "Sin conexión", reload: mockReload });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <PantalonMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Sin conexión")).toBeTruthy();
  });
});
