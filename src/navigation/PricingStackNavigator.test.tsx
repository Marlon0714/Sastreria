import { describe, expect, it } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import PricingStackNavigator from "./PricingStackNavigator";

describe("PricingStackNavigator", () => {
  it("renderiza la pantalla placeholder de precios por defecto", async () => {
    // Arrange
    const { findByText } = render(
      <NavigationContainer>
        <PricingStackNavigator />
      </NavigationContainer>,
    );

    // Act
    const message = await findByText(
      "Proximamente podras administrar el catalogo de precios.",
    );

    // Assert
    expect(message).toBeTruthy();
  });
});
