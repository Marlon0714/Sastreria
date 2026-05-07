import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";

import { SyncLifecycleController } from "./SyncLifecycleController";

// jest.mock is hoisted before const declarations, so the factory must use
// jest.fn() inline; the implementation is configured in beforeEach instead.
jest.mock("react-native", () => ({
  AppState: {
    currentState: "background",
    addEventListener: jest.fn(),
  },
}));

describe("SyncLifecycleController", () => {
  let mockAppStateListener: ((nextState: string) => void) | null = null;
  const mockRemove = jest.fn();
  const mockAddEventListener = AppState.addEventListener as jest.Mock;

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
