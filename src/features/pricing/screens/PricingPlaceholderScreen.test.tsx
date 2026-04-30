import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import PricingPlaceholderScreen from "./PricingPlaceholderScreen";

describe("PricingPlaceholderScreen", () => {
  it("muestra titulo y mensajes informativos del modulo", () => {
    // Arrange
    render(<PricingPlaceholderScreen />);

    // Act
    const title = screen.getByRole("header", { name: "Precios" });

    // Assert
    expect(title).toBeTruthy();
    expect(
      screen.getByText(
        "Proximamente podras administrar el catalogo de precios.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Este modulo se habilitara en una siguiente entrega."),
    ).toBeTruthy();
  });
});
