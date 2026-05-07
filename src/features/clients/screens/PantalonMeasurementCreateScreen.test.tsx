import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import PantalonMeasurementCreateScreen from "./PantalonMeasurementCreateScreen";

const mockUpsertPantalon = jest.fn<() => Promise<unknown>>();
const mockReplace = jest.fn();

jest.mock("../hooks/useUpsertPantalon", () => ({
  useUpsertPantalon: () => ({
    upsertPantalon: mockUpsertPantalon,
    isSubmitting: false,
    error: null,
  }),
}));

function buildProps(clientId = "client-1") {
  return {
    navigation: { replace: mockReplace } as never,
    route: { params: { clientId } } as never,
  };
}

function renderScreen(clientId = "client-1") {
  return render(
    <ClientsDependenciesProvider dependencies={noopDependencies}>
      <PantalonMeasurementCreateScreen {...buildProps(clientId)} />
    </ClientsDependenciesProvider>,
  );
}

describe("PantalonMeasurementCreateScreen", () => {
  beforeEach(() => {
    mockUpsertPantalon.mockReset();
    mockReplace.mockReset();
  });

  it("renders the form with a save button", () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText("Guardar medidas de pantalón")).toBeTruthy();
    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("calls upsertPantalon and navigates to Detail on success", async () => {
    const mockMeasurement = { id: "m-2", clientId: "client-1" };
    mockUpsertPantalon.mockResolvedValue(mockMeasurement);

    const { getByLabelText } = renderScreen("client-1");
    fireEvent.press(getByLabelText("Guardar medidas de pantalón"));

    await waitFor(() => {
      expect(mockUpsertPantalon).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: "client-1" }),
      );
      expect(mockReplace).toHaveBeenCalledWith("PantalonMeasurementDetail", {
        clientId: "client-1",
      });
    });
  });

  it("does not navigate when upsert returns null (error path)", async () => {
    mockUpsertPantalon.mockResolvedValue(null);

    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText("Guardar medidas de pantalón"));

    await waitFor(() => {
      expect(mockUpsertPantalon).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
