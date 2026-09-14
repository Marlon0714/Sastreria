import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";

import { _resetSupabaseClient, getSupabaseClient } from "./client";

const mockStartAutoRefresh = jest.fn<() => Promise<void>>();
const mockStopAutoRefresh = jest.fn<() => Promise<void>>();
const mockCreateClient = jest.fn(
  (..._args: [url: string, key: string, options: unknown]) => ({
    auth: {
      startAutoRefresh: mockStartAutoRefresh,
      stopAutoRefresh: mockStopAutoRefresh,
    },
  }),
);

let mockAppStateListener: ((state: string) => void) | null = null;
const mockAddEventListener = jest.fn(
  (_event: string, listener: (state: string) => void) => {
    mockAppStateListener = listener;
    return { remove: jest.fn() };
  },
);
const mockAppState: { currentState: string } = { currentState: "active" };

jest.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, options: unknown) =>
    mockCreateClient(url, key, options),
}));

// `jest.spyOn` en vez de `jest.mock("react-native", ...)`: mockear el
// módulo completo (aunque sea con spread sobre `requireActual`) dispara la
// re-evaluación de submódulos nativos de RN (`DevMenu`, etc.) y rompe la
// suite con un `TurboModuleRegistry` inexistente en el entorno de test —
// mismo hallazgo ya documentado en FilterChipDropdown.test.tsx.
// `currentState` es una propiedad de datos (no un getter) en el módulo
// real, así que `jest.spyOn(obj, prop, "get")` no aplica — se redefine
// directamente con `Object.defineProperty`.
Object.defineProperty(AppState, "currentState", {
  configurable: true,
  get: () => mockAppState.currentState,
});
jest
  .spyOn(AppState, "addEventListener")
  .mockImplementation((event, listener) =>
    mockAddEventListener(event, listener as (state: string) => void),
  );

jest.mock("./config", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "publishable-key",
  }),
}));

jest.mock("./secureSessionStorage", () => ({
  secureSessionStorage: {},
}));

describe("getSupabaseClient", () => {
  beforeEach(() => {
    _resetSupabaseClient();
    mockCreateClient.mockClear();
    mockStartAutoRefresh.mockClear();
    mockStopAutoRefresh.mockClear();
    mockAddEventListener.mockClear();
    mockAppStateListener = null;
    mockAppState.currentState = "active";
  });

  it("registers a single AppState listener and starts auto refresh when created while active", () => {
    getSupabaseClient();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not start auto refresh on creation when the app is backgrounded", () => {
    mockAppState.currentState = "background";

    getSupabaseClient();

    expect(mockStartAutoRefresh).not.toHaveBeenCalled();
  });

  it("starts auto refresh when the app returns to foreground", () => {
    getSupabaseClient();
    mockStartAutoRefresh.mockClear();

    mockAppStateListener?.("background");
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);

    mockAppStateListener?.("active");
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("returns the same singleton instance across calls without re-registering listeners", () => {
    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });
});
