import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import CamisaMeasurementCreateScreen from "./CamisaMeasurementCreateScreen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpsertCamisa = jest.fn<() => Promise<unknown>>();
const mockReplace = jest.fn();

jest.mock("../hooks/useUpsertCamisa", () => ({
  useUpsertCamisa: () => ({
    upsertCamisa: mockUpsertCamisa,
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
      <CamisaMeasurementCreateScreen {...buildProps(clientId)} />
    </ClientsDependenciesProvider>,
  );
}

describe("CamisaMeasurementCreateScreen", () => {
  beforeEach(() => {
    mockUpsertCamisa.mockReset();
    mockReplace.mockReset();
  });

  it("renders the form with a save button", () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText("Guardar medidas de camisa")).toBeTruthy();
    expect(getByLabelText("Espalda (cm)")).toBeTruthy();
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("calls upsertCamisa and navigates to Detail on success", async () => {
    const mockMeasurement = { id: "m-1", clientId: "client-1" };
    mockUpsertCamisa.mockResolvedValue(mockMeasurement);

    const { getByLabelText } = renderScreen("client-1");
    fireEvent.press(getByLabelText("Guardar medidas de camisa"));

    await waitFor(() => {
      expect(mockUpsertCamisa).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: "client-1" }),
      );
      expect(mockReplace).toHaveBeenCalledWith("CamisaMeasurementDetail", {
        clientId: "client-1",
      });
    });
  });

  it("does not navigate when upsert returns null (error path)", async () => {
    mockUpsertCamisa.mockResolvedValue(null);

    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText("Guardar medidas de camisa"));

    await waitFor(() => {
      expect(mockUpsertCamisa).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
