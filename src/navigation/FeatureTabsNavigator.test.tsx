import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import RootNavigator from "./RootNavigator";

jest.mock("./ClientsStackNavigator", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return function MockClientsStackNavigator() {
    return React.createElement(Text, null, "Pantalla clientes");
  };
});

// Mock useAuth so RootNavigator renders tabs directly (authenticated state)
jest.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe("RootNavigator tabs composition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mantiene accesible clients y muestra placeholders al cambiar de tab", async () => {
    // Arrange
    const { findByText, getByText } = render(<RootNavigator />);

    // Assert
    expect(getByText("Clientes")).toBeTruthy();
    expect(getByText("Agenda")).toBeTruthy();
    expect(getByText("Precios")).toBeTruthy();
    expect(getByText("Pantalla clientes")).toBeTruthy();

    // Act
    fireEvent.press(getByText("Agenda"));

    // Assert
    expect(
      await findByText("Proximamente podras gestionar arreglos."),
    ).toBeTruthy();

    // Act
    fireEvent.press(getByText("Precios"));

    // Assert
    expect(
      await findByText(
        "Proximamente podras administrar el catalogo de precios.",
      ),
    ).toBeTruthy();

    // Act
    fireEvent.press(getByText("Clientes"));

    // Assert
    expect(await findByText("Pantalla clientes")).toBeTruthy();
  });
});
