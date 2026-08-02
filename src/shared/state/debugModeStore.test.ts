import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useDebugModeStore } from "./debugModeStore";

const mockGetItemAsync = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItemAsync = jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string): Promise<string | null> =>
    mockGetItemAsync(key),
  setItemAsync: (key: string, value: string): Promise<void> =>
    mockSetItemAsync(key, value),
}));

describe("debugModeStore", () => {
  beforeEach(() => {
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue();
    useDebugModeStore.setState({ debugModeUnlocked: false });
  });

  it("starts locked by default", () => {
    expect(useDebugModeStore.getState().debugModeUnlocked).toBe(false);
  });

  it("stays locked after hydrate when no flag was persisted", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await useDebugModeStore.getState().hydrate();

    expect(useDebugModeStore.getState().debugModeUnlocked).toBe(false);
  });

  it("unlocks after hydrate when the persisted flag is true", async () => {
    mockGetItemAsync.mockResolvedValue("true");

    await useDebugModeStore.getState().hydrate();

    expect(useDebugModeStore.getState().debugModeUnlocked).toBe(true);
  });

  it("unlock persists the flag and updates state", async () => {
    await useDebugModeStore.getState().unlock();

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "sastreria_debug_mode_unlocked",
      "true",
    );
    expect(useDebugModeStore.getState().debugModeUnlocked).toBe(true);
  });
});
