import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { useIdentityGate } from "./useIdentityGate";

type MockError = { message: string } | null;

const mockRpc =
  jest.fn<() => Promise<{ data: unknown; error: MockError }>>();

jest.mock("../../../data/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

const personalProfile = {
  id: "user-1",
  displayName: "María Gómez",
  role: "operario" as const,
  isSharedDevice: false,
};

const sharedDeviceProfile = {
  id: "tablet-1",
  displayName: "Tablet mostrador",
  role: "operario" as const,
  isSharedDevice: true,
};

describe("useIdentityGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIdentityStore.getState().reset();
  });

  it("no pide PIN y retorna ownProfile de inmediato si no es dispositivo compartido", async () => {
    useIdentityStore.getState().setOwnProfile(personalProfile);
    const { result } = renderHook(() => useIdentityGate());

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.requireIdentity();
    });

    expect(resolved).toEqual(personalProfile);
    expect(result.current.isPinPromptVisible).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("retorna el resolvedActor cacheado sin volver a pedir PIN", async () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    useIdentityStore.getState().setResolvedActor(personalProfile);
    const { result } = renderHook(() => useIdentityGate());

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.requireIdentity();
    });

    expect(resolved).toEqual(personalProfile);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("pide PIN cuando es dispositivo compartido y no hay actor resuelto aún", async () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    const { result } = renderHook(() => useIdentityGate());

    act(() => {
      void result.current.requireIdentity();
    });

    expect(result.current.isPinPromptVisible).toBe(true);
  });

  it("resuelve la identidad tras validar un PIN correcto", async () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    mockRpc.mockResolvedValue({
      data: [{ id: "user-2", display_name: "Juan Pérez", role: "operario" }],
      error: null,
    });
    const { result } = renderHook(() => useIdentityGate());

    let identityPromise: Promise<unknown>;
    act(() => {
      identityPromise = result.current.requireIdentity();
    });

    await act(async () => {
      await result.current.submitPin("1234");
    });

    const resolved = await identityPromise!;

    expect(mockRpc).toHaveBeenCalledWith("resolve_operario_by_pin", {
      candidate_pin: "1234",
    });
    expect(resolved).toEqual({
      id: "user-2",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    expect(result.current.isPinPromptVisible).toBe(false);
    expect(useIdentityStore.getState().resolvedActor).toEqual({
      id: "user-2",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
  });

  it("muestra error y mantiene el modal abierto si el PIN no coincide con ningún operario", async () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useIdentityGate());

    act(() => {
      void result.current.requireIdentity();
    });

    await act(async () => {
      await result.current.submitPin("0000");
    });

    expect(result.current.pinError).toBe("PIN incorrecto. Intenta de nuevo.");
    expect(result.current.isPinPromptVisible).toBe(true);
  });

  it("resuelve a null si se cancela el prompt de PIN", async () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    const { result } = renderHook(() => useIdentityGate());

    let identityPromise: Promise<unknown>;
    act(() => {
      identityPromise = result.current.requireIdentity();
    });

    act(() => {
      result.current.cancelPinPrompt();
    });

    const resolved = await identityPromise!;

    expect(resolved).toBeNull();
    expect(result.current.isPinPromptVisible).toBe(false);
  });
});
