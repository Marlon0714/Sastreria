import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import MeasurementTypeSelectScreen from "./MeasurementTypeSelectScreen";

const mockNavigate = jest.fn();

function buildProps(mode: "create" | "view", clientId = "client-uuid-1") {
  return {
    navigation: { navigate: mockNavigate } as never,
    route: { params: { clientId, mode } } as never,
  };
}

describe("MeasurementTypeSelectScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renders camisa and pantalon buttons in create mode with skip option", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("create")} />,
    );
    expect(getByLabelText("Registrar medidas de camisa")).toBeTruthy();
    expect(getByLabelText("Registrar medidas de pantalón")).toBeTruthy();
    expect(getByLabelText("Continuar sin medidas")).toBeTruthy();
    expect(queryByLabelText("Ver medidas de camisa")).toBeNull();
  });

  it("renders view buttons in view mode without skip option", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("view")} />,
    );
    expect(getByLabelText("Ver medidas de camisa")).toBeTruthy();
    expect(getByLabelText("Ver medidas de pantalón")).toBeTruthy();
    expect(queryByLabelText("Continuar sin medidas")).toBeNull();
  });

  it("navigates to CamisaMeasurementDetail on camisa press in create mode", () => {
    const { getByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("create", "abc-123")} />,
    );
    fireEvent.press(getByLabelText("Registrar medidas de camisa"));
    expect(mockNavigate).toHaveBeenCalledWith("CamisaMeasurementDetail", {
      clientId: "abc-123",
      mode: "create",
    });
  });

  it("navigates to PantalonMeasurementDetail on pantalon press in view mode", () => {
    const { getByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("view", "xyz-456")} />,
    );
    fireEvent.press(getByLabelText("Ver medidas de pantalón"));
    expect(mockNavigate).toHaveBeenCalledWith("PantalonMeasurementDetail", {
      clientId: "xyz-456",
      mode: "view",
    });
  });

  it("navigates to ClientDetail when pressing skip button in create mode", () => {
    const { getByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("create", "abc-123")} />,
    );
    fireEvent.press(getByLabelText("Continuar sin medidas"));
    expect(mockNavigate).toHaveBeenCalledWith("ClientDetail", {
      clientId: "abc-123",
    });
  });
});
