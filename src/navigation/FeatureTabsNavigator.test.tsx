import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import RootNavigator from "./RootNavigator";
import { useSyncStatusStore } from "../shared/state/syncStatusStore";

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
    useSyncStatusStore.getState().reset();
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

  it("muestra banner global en modo local-only", () => {
    useSyncStatusStore.getState().setMode("local-only");

    const { getByTestId, getByText } = render(<RootNavigator />);

    expect(getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      getByText(
        "Modo local activo. Tus cambios se guardan en este dispositivo.",
      ),
    ).toBeTruthy();
  });

  it("muestra banner global sin conexion con pendientes", () => {
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("offline");
    useSyncStatusStore.getState().setHasPending(true);

    const { getByTestId, getByText } = render(<RootNavigator />);

    expect(getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      getByText("Sin conexion. Tus cambios se sincronizaran al reconectar."),
    ).toBeTruthy();
  });

  it("muestra banner global con cambios pendientes por sincronizar cuando hay conexion", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("online");
    useSyncStatusStore.getState().setHasPending(true);

    // Act
    const { getByTestId, getByText } = render(<RootNavigator />);

    // Assert
    expect(getByTestId("sync-status-banner")).toBeTruthy();
    expect(getByText("Hay cambios pendientes por sincronizar.")).toBeTruthy();
  });

  it("no muestra banner cuando no hay pendientes y el modo es cloud online", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("online");
    useSyncStatusStore.getState().setHasPending(false);

    // Act
    const { queryByTestId } = render(<RootNavigator />);

    // Assert
    expect(queryByTestId("sync-status-banner")).toBeNull();
  });
});
