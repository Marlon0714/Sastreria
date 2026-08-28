import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import PricingStackNavigator from "./PricingStackNavigator";
import * as usePricingServicesModule from "../features/pricing/hooks/usePricingServices";
import { useIdentityStore } from "../shared/state/identityStore";

jest.mock("../features/pricing/hooks/usePricingServices");
jest.mock("../features/auth/components/LogoutButton", () => ({
  LogoutButton: () => null,
}));
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

function renderPricingStack() {
  return render(
    <NavigationContainer>
      <PricingStackNavigator />
    </NavigationContainer>,
  );
}

describe("PricingStackNavigator", () => {
  beforeEach(() => {
    useIdentityStore.getState().reset();
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
  });

  it("renderiza la pantalla de lista de precios por defecto (sin perfil resuelto)", async () => {
    const { findByText } = renderPricingStack();

    // Assert — la lista vacía muestra el empty state de la categoría activa
    expect(await findByText("Sin arreglos aún")).toBeTruthy();
  });

  it("muestra 'Mis arreglos' para un operario en su propio dispositivo", async () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });

    const { findByText, queryByText } = renderPricingStack();

    expect(await findByText("No hiciste ningún arreglo este día.")).toBeTruthy();
    expect(queryByText("Sin arreglos aún")).toBeNull();
  });

  it("regresión: la tablet compartida con role=operario sigue viendo el catálogo de precios, no 'Mis arreglos'", async () => {
    useIdentityStore.getState().setOwnProfile({
      id: "tablet-1",
      displayName: "Tablet mostrador",
      role: "operario",
      isSharedDevice: true,
    });

    const { findByText, queryByText } = renderPricingStack();

    expect(await findByText("Sin arreglos aún")).toBeTruthy();
    expect(queryByText("No hiciste ningún arreglo este día.")).toBeNull();
  });
});
