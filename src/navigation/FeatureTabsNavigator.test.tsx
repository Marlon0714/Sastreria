import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./RootNavigator";
import { useIdentityStore } from "../shared/state/identityStore";
import { useSyncStatusStore } from "../shared/state/syncStatusStore";

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderRootNavigator() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <RootNavigator />
    </SafeAreaProvider>,
  );
}

jest.mock("../features/pricing/hooks/usePricingServices", () => ({
  usePricingServices: () => ({
    services: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    syncStatus: "synced",
    isOffline: false,
  }),
}));

// Para un operario, PricingTab ya no muestra la lista de precios sino "Mis
// arreglos" (ver PricingStackNavigator) — se mockea igual que
// usePricingServices arriba, sin datos, solo para que el tab cargue.
jest.mock("../features/account/hooks/useMyActivity", () => ({
  useMyActivity: () => ({
    items: [],
    total: 0,
    isLoading: false,
    error: null,
    priceError: null,
    reload: jest.fn(),
    addPrice: jest.fn(),
  }),
}));

jest.mock("./ClientsStackNavigator", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return function MockClientsStackNavigator() {
    return React.createElement(Text, null, "Pantalla clientes");
  };
});

jest.mock("./ScheduleStackNavigator", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return function MockScheduleStackNavigator() {
    return React.createElement(Text, null, "Pantalla agenda");
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
    useIdentityStore.getState().reset();
  });

  it("restringe a un operario en su propio dispositivo a Agenda y Mis arreglos (no el catálogo de precios)", async () => {
    useIdentityStore.getState().setOwnProfile({
      id: "user-1",
      displayName: "María Gómez",
      role: "operario",
      isSharedDevice: false,
    });

    const { getByTestId, queryByTestId, getAllByText, findByText } =
      renderRootNavigator();

    expect(queryByTestId("tab-ClientsTab")).toBeNull();
    expect(queryByTestId("tab-TallasTab")).toBeNull();
    expect(getByTestId("tab-ScheduleTab")).toBeTruthy();
    expect(getByTestId("tab-PricingTab")).toBeTruthy();
    // El label de esa pestaña ya no dice "Precios" para un operario (aparece
    // tanto en el header como en la barra de pestañas).
    expect(getAllByText("Mis arreglos").length).toBeGreaterThan(0);

    fireEvent.press(getByTestId("tab-PricingTab"));

    // Muestra el contenido de "Mis arreglos", no el catálogo de precios.
    expect(
      await findByText("No hiciste ningún arreglo este día."),
    ).toBeTruthy();
  });

  it("muestra todas las tabs en la tablet compartida sin importar su role", async () => {
    useIdentityStore.getState().setOwnProfile({
      id: "tablet-1",
      displayName: "Tablet mostrador",
      role: "operario",
      isSharedDevice: true,
    });

    const { getByTestId, getAllByText, findByText, queryByText } =
      renderRootNavigator();

    expect(getByTestId("tab-ClientsTab")).toBeTruthy();
    expect(getByTestId("tab-TallasTab")).toBeTruthy();
    expect(getByTestId("tab-ScheduleTab")).toBeTruthy();
    expect(getByTestId("tab-PricingTab")).toBeTruthy();

    // Regresión: aunque el perfil de la tablet tenga role="operario", al
    // ser dispositivo compartido esa pestaña debe seguir siendo el
    // catálogo de precios (no "Mis arreglos", que quedaría vacío porque
    // se filtraría por el id de la tablet, que no es el de ningún
    // operario real).
    expect(getAllByText("Precios").length).toBeGreaterThan(0);
    expect(queryByText("Mis arreglos")).toBeNull();

    fireEvent.press(getByTestId("tab-PricingTab"));
    expect(await findByText("Sin arreglos aún")).toBeTruthy();
  });

  it("muestra todas las tabs para el dueño", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });

    const { getByTestId } = renderRootNavigator();

    expect(getByTestId("tab-ClientsTab")).toBeTruthy();
    expect(getByTestId("tab-TallasTab")).toBeTruthy();
    expect(getByTestId("tab-ScheduleTab")).toBeTruthy();
    expect(getByTestId("tab-PricingTab")).toBeTruthy();
  });

  it("mantiene accesible clients y muestra placeholders al cambiar de tab", async () => {
    // Arrange
    const { findByText, getByText, getByTestId } = renderRootNavigator();

    // Assert
    expect(getByTestId("tab-ClientsTab")).toBeTruthy();
    expect(getByTestId("tab-ScheduleTab")).toBeTruthy();
    expect(getByTestId("tab-PricingTab")).toBeTruthy();
    expect(getByText("Pantalla clientes")).toBeTruthy();

    // Act
    fireEvent.press(getByTestId("tab-ScheduleTab"));

    // Assert
    expect(await findByText("Pantalla agenda")).toBeTruthy();

    // Act
    fireEvent.press(getByTestId("tab-PricingTab"));

    // Assert - pricing ya tiene pantalla real, verificamos que el tab carga
    expect(await findByText("Sin arreglos aún")).toBeTruthy();

    // Act
    fireEvent.press(getByTestId("tab-ClientsTab"));

    // Assert
    expect(await findByText("Pantalla clientes")).toBeTruthy();
  });

  it("muestra Cerrar sesión en el header (no la flecha de volver) en cualquier pestaña, no solo en la primera", async () => {
    // Regresión: backBehavior por defecto ("firstRoute") agrega una entrada
    // de "volver a la primera pestaña" en el historial apenas se cambia a
    // CUALQUIER otra pestaña — eso hacía que canGoBack() diera true en
    // Agenda/Precios/Tallas (mostrando la flecha de "Volver" del header en
    // vez de "Cerrar sesión"), y solo en Clientes (la primera) diera false.
    const { findByText, getByTestId, getByLabelText, queryByLabelText } =
      renderRootNavigator();

    expect(getByLabelText("Cerrar sesión")).toBeTruthy();
    expect(queryByLabelText("Volver")).toBeNull();

    fireEvent.press(getByTestId("tab-ScheduleTab"));
    await findByText("Pantalla agenda");

    expect(getByLabelText("Cerrar sesión")).toBeTruthy();
    expect(queryByLabelText("Volver")).toBeNull();

    fireEvent.press(getByTestId("tab-PricingTab"));
    await findByText("Sin arreglos aún");

    expect(getByLabelText("Cerrar sesión")).toBeTruthy();
    expect(queryByLabelText("Volver")).toBeNull();
  });

  it("muestra banner global en modo local-only", () => {
    useSyncStatusStore.getState().setMode("local-only");

    const { getByTestId, getByText } = renderRootNavigator();

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

    const { getByTestId, getByText } = renderRootNavigator();

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
    const { getByTestId, getByText } = renderRootNavigator();

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
    const { queryByTestId } = renderRootNavigator();

    // Assert
    expect(queryByTestId("sync-status-banner")).toBeNull();
  });
});
