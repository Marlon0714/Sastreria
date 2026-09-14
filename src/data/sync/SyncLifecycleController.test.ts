import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";

import { SyncLifecycleController } from "./SyncLifecycleController";

// `jest.spyOn` en vez de `jest.mock("react-native", ...)`: mockear el
// módulo completo (aunque sea con spread sobre `requireActual`) dispara la
// re-evaluación de submódulos nativos de RN (`DevMenu`, etc.) y rompe la
// suite con un `TurboModuleRegistry` inexistente en el entorno de test —
// mismo hallazgo ya documentado en FilterChipDropdown.test.tsx.
const mockAddEventListener = jest.spyOn(AppState, "addEventListener");
// `currentState` es una propiedad de datos (no un getter) en el módulo
// real, así que `jest.spyOn(obj, prop, "get")` no aplica — se redefine
// directamente con `Object.defineProperty`.
Object.defineProperty(AppState, "currentState", {
  configurable: true,
  get: () => "background",
});

describe("SyncLifecycleController", () => {
  let mockAppStateListener: ((nextState: string) => void) | null = null;
  const mockRemove = jest.fn();

  beforeEach(() => {
    mockAppStateListener = null;
    mockRemove.mockReset();
    // Simulate RN behavior: calling remove() unregisters the listener
    mockRemove.mockImplementation(() => {
      mockAppStateListener = null;
    });
    mockAddEventListener.mockReset();
    mockAddEventListener.mockImplementation(
      (_event: unknown, listener: unknown) => {
        mockAppStateListener = listener as (nextState: string) => void;
        return { remove: mockRemove };
      },
    );
  });

  it("triggers foreground callback on background->active transition", () => {
    const onEnterForeground = jest.fn();
    const controller = new SyncLifecycleController(onEnterForeground);

    controller.start();
    mockAppStateListener?.("inactive");
    mockAppStateListener?.("active");

    expect(onEnterForeground).toHaveBeenCalledTimes(1);
  });

  it("does not trigger on active->active transitions", () => {
    const onEnterForeground = jest.fn();
    const controller = new SyncLifecycleController(onEnterForeground);

    controller.start();
    mockAppStateListener?.("active");
    mockAppStateListener?.("active");

    expect(onEnterForeground).toHaveBeenCalledTimes(1);
  });

  it("removes subscription on stop", () => {
    const controller = new SyncLifecycleController(() => {
      return;
    });

    controller.start();
    controller.stop();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it("does not register duplicated listeners on repeated start", () => {
    // Arrange
    const controller = new SyncLifecycleController(() => {
      return;
    });

    // Act
    controller.start();
    controller.start();

    // Assert
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it("does not trigger foreground callback after stop", () => {
    // Arrange
    const onEnterForeground = jest.fn();
    const controller = new SyncLifecycleController(onEnterForeground);

    // Act
    controller.start();
    controller.stop();
    mockAppStateListener?.("active");

    // Assert
    expect(onEnterForeground).not.toHaveBeenCalled();
  });
});
