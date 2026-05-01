import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import CamisaMeasurementDetailScreen from "./CamisaMeasurementDetailScreen";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockUpsertCamisa = jest.fn();
const mockReload = jest.fn();

jest.mock("../hooks/useCamisaMeasurement", () => ({
  useCamisaMeasurement: jest.fn(),
}));

jest.mock("../hooks/useUpsertCamisa", () => ({
  useUpsertCamisa: () => ({
    upsertCamisa: mockUpsertCamisa,
    isSubmitting: false,
    error: null,
  }),
}));

import { useCamisaMeasurement } from "../hooks/useCamisaMeasurement";
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
  });

  it("renders loading state", () => {
    mockUseCamisa.mockReturnValue({ measurement: null, isLoading: true, error: null, reload: mockReload });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Cargando medidas...")).toBeTruthy();
  });

  it("renders empty state with add button when no measurement exists", () => {
    mockUseCamisa.mockReturnValue({ measurement: null, isLoading: false, error: null, reload: mockReload });
    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps("c-1")} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText(/no hay medidas de camisa/i)).toBeTruthy();
    fireEvent.press(getByLabelText("Agregar medidas de camisa"));
    expect(mockReplace).toHaveBeenCalledWith("CamisaMeasurementCreate", { clientId: "c-1" });
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
      expect(getByLabelText("Guardar cambios de camisa")).toBeTruthy();
      expect(getByLabelText("Cancelar edición de camisa")).toBeTruthy();
    });
  });

  it("renders error state with retry button", () => {
    mockUseCamisa.mockReturnValue({ measurement: null, isLoading: false, error: "Error de red", reload: mockReload });
    const { getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <CamisaMeasurementDetailScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );
    expect(getByText("Error de red")).toBeTruthy();
  });
});
