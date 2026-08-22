import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIdentityStore } from "../shared/state/identityStore";
import { AppHeader } from "./AppHeader";

jest.mock("../features/auth/components/LogoutButton", () => ({
  LogoutButton: () => null,
}));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderAppHeader(navigationRef: unknown) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <AppHeader navigationRef={navigationRef as never} />
    </SafeAreaProvider>,
  );
}

type Listener = () => void;

interface FakeNavigationRefOptions {
  title?: string;
  canGoBack?: boolean;
  activeTab?: string;
}

function makeFakeNavigationRef(options: FakeNavigationRefOptions = {}) {
  const listeners: Record<string, Listener[]> = { state: [], options: [] };
  const ref = {
    getCurrentOptions: jest.fn(() => ({ title: options.title })),
    canGoBack: jest.fn(() => options.canGoBack ?? false),
    goBack: jest.fn(),
    navigate: jest.fn(),
    getState: jest.fn(() => ({
      index: 0,
      routes: [{ name: options.activeTab ?? "ScheduleTab" }],
    })),
    addListener: jest.fn((event: string, cb: Listener) => {
      listeners[event]!.push(cb);
      return () => {
        listeners[event] = listeners[event]!.filter((l) => l !== cb);
      };
    }),
    emit(event: "state" | "options"): void {
      listeners[event]!.forEach((cb) => cb());
    },
  };
  return ref;
}

describe("AppHeader", () => {
  beforeEach(() => {
    useIdentityStore.getState().reset();
  });

  it("muestra el título de la pantalla enfocada", () => {
    const navigationRef = makeFakeNavigationRef({ title: "Agenda" });

    const { getByText } = renderAppHeader(navigationRef);

    expect(getByText("Agenda")).toBeTruthy();
  });

  it("actualiza el título cuando cambia el estado de navegación", () => {
    const navigationRef = makeFakeNavigationRef({ title: "Agenda" });

    const { getByText, rerender } = renderAppHeader(navigationRef);
    expect(getByText("Agenda")).toBeTruthy();

    navigationRef.getCurrentOptions.mockReturnValue({ title: "Nuevo turno" });
    navigationRef.canGoBack.mockReturnValue(true);
    act(() => navigationRef.emit("state"));
    rerender(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <AppHeader navigationRef={navigationRef as never} />
      </SafeAreaProvider>,
    );

    expect(getByText("Nuevo turno")).toBeTruthy();
  });

  it("sin poder volver, muestra Mi cuenta/Cerrar sesión y no la flecha de volver", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    const navigationRef = makeFakeNavigationRef({
      title: "Agenda",
      canGoBack: false,
    });

    const { getByLabelText, queryByLabelText } = renderAppHeader(navigationRef);

    expect(queryByLabelText("Volver")).toBeNull();
    expect(getByLabelText("Mi cuenta")).toBeTruthy();
  });

  it("pudiendo volver, muestra la flecha y oculta Mi cuenta", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    const navigationRef = makeFakeNavigationRef({
      title: "Nuevo turno",
      canGoBack: true,
    });

    const { getByLabelText, queryByLabelText } = renderAppHeader(navigationRef);

    expect(queryByLabelText("Mi cuenta")).toBeNull();
    fireEvent.press(getByLabelText("Volver"));
    expect(navigationRef.goBack).toHaveBeenCalledTimes(1);
  });

  it("Mi cuenta navega a MyAccount dentro de la pestaña activa (Agenda)", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    const navigationRef = makeFakeNavigationRef({
      title: "Agenda",
      canGoBack: false,
      activeTab: "ScheduleTab",
    });

    const { getByLabelText } = renderAppHeader(navigationRef);

    fireEvent.press(getByLabelText("Mi cuenta"));

    expect(navigationRef.navigate).toHaveBeenCalledWith("ScheduleTab", {
      screen: "MyAccount",
    });
  });

  it("Mi cuenta navega a MyAccount dentro de la pestaña activa (Precios)", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    const navigationRef = makeFakeNavigationRef({
      title: "Precios",
      canGoBack: false,
      activeTab: "PricingTab",
    });

    const { getByLabelText } = renderAppHeader(navigationRef);

    fireEvent.press(getByLabelText("Mi cuenta"));

    expect(navigationRef.navigate).toHaveBeenCalledWith("PricingTab", {
      screen: "MyAccount",
    });
  });

  it("no muestra Mi cuenta para el dueño", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });
    const navigationRef = makeFakeNavigationRef({ canGoBack: false });

    const { queryByLabelText } = renderAppHeader(navigationRef);

    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });
});
