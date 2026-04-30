import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import SchedulePlaceholderScreen from "./SchedulePlaceholderScreen";

describe("SchedulePlaceholderScreen", () => {
  it("muestra titulo y mensajes informativos del modulo", () => {
    // Arrange
    render(<SchedulePlaceholderScreen />);

    // Act
    const title = screen.getByRole("header", { name: "Agenda" });

    // Assert
    expect(title).toBeTruthy();
    expect(
      screen.getByText("Proximamente podras gestionar arreglos."),
    ).toBeTruthy();
    expect(
      screen.getByText("Este modulo se habilitara en una siguiente entrega."),
    ).toBeTruthy();
  });
});
