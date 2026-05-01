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

  it("renders 'Continuar sin medidas' button in create mode", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("create")} />,
    );
    expect(getByLabelText("Continuar sin medidas")).toBeTruthy();
    expect(queryByLabelText("Volver al detalle del cliente")).toBeNull();
  });

  it("renders 'Volver al detalle' button in view mode", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("view")} />,
    );
    expect(getByLabelText("Volver al detalle del cliente")).toBeTruthy();
    expect(queryByLabelText("Continuar sin medidas")).toBeNull();
  });

  it("navigates to ClientDetail when pressing create-mode button", () => {
    const { getByLabelText } = render(
      <MeasurementTypeSelectScreen {...buildProps("create", "abc-123")} />,
    );
    fireEvent.press(getByLabelText("Continuar sin medidas"));
    expect(mockNavigate).toHaveBeenCalledWith("ClientDetail", {
      clientId: "abc-123",
    });
  });
});
