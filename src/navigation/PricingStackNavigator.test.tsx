import { describe, expect, it, jest } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import PricingStackNavigator from "./PricingStackNavigator";
import * as usePricingServicesModule from "../features/pricing/hooks/usePricingServices";

jest.mock("../features/pricing/hooks/usePricingServices");

describe("PricingStackNavigator", () => {
  it("renderiza la pantalla de lista de precios por defecto", async () => {
    // Arrange
    jest.spyOn(usePricingServicesModule, "usePricingServices").mockReturnValue({
      services: [],
      loading: false,
      error: null,
      refresh: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      syncStatus: "synced",
      isOffline: false,
    });
    const { findByText } = render(
      <NavigationContainer>
        <PricingStackNavigator />
      </NavigationContainer>,
    );

    // Assert — la lista vacía muestra el empty state de la categoría activa
    expect(await findByText("Sin arreglos aún")).toBeTruthy();
  });
});
