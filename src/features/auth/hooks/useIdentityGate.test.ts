import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { useSyncStatusStore } from "../../../shared/state/syncStatusStore";
import { useIdentityGate } from "./useIdentityGate";

type MockError = { message: string } | null;

const mockRpc =
  jest.fn<() => Promise<{ data: unknown; error: MockError }>>();

jest.mock("../../../data/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

const mockGetOperarios = jest.fn<() => Promise<unknown[]>>();

jest.mock("../../../data/local/profilesCacheDependencies", () => ({
  getDefaultProfilesCacheRepository: () => ({
    getOperarios: () => mockGetOperarios(),
  }),
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
    useSyncStatusStore.getState().reset();
    mockGetOperarios.mockResolvedValue([]);
  });

  it("no pide PIN y retorna ownProfile de inmediato si no es dispositivo compartido", async () => {
    useIdentityStore.getState().setOwnProfile(personalProfile);
    const { result } = renderHook(() => useIdentityGate());

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.requireIdentity();
    });

    expect(resolved).toEqual({ profile: personalProfile, verified: true });
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

    expect(resolved).toEqual({ profile: personalProfile, verified: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("pide PIN cuando es dispositivo compartido, hay conexión y no hay actor resuelto aún", async () => {
    useSyncStatusStore.getState().setConnectivity("online");
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    const { result } = renderHook(() => useIdentityGate());

    act(() => {
      void result.current.requireIdentity();
    });

    expect(result.current.isPinPromptVisible).toBe(true);
  });

  it("resuelve la identidad tras validar un PIN correcto", async () => {
    useSyncStatusStore.getState().setConnectivity("online");
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
      profile: {
        id: "user-2",
        displayName: "Juan Pérez",
        role: "operario",
        isSharedDevice: false,
      },
      verified: true,
    });
    expect(result.current.isPinPromptVisible).toBe(false);
    expect(useIdentityStore.getState().resolvedActor).toEqual({
      id: "user-2",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
  });

  it("una segunda llamada mientras el PIN ya está abierto se une a la misma espera en vez de quedar colgada", async () => {
    useSyncStatusStore.getState().setConnectivity("online");
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    mockRpc.mockResolvedValue({
      data: [{ id: "user-2", display_name: "Juan Pérez", role: "operario" }],
      error: null,
    });
    const { result } = renderHook(() => useIdentityGate());

    let firstPromise: Promise<unknown>;
    let secondPromise: Promise<unknown>;
    act(() => {
      firstPromise = result.current.requireIdentity();
      secondPromise = result.current.requireIdentity();
    });

    expect(result.current.isPinPromptVisible).toBe(true);

    await act(async () => {
      await result.current.submitPin("1234");
    });

    const [firstResolved, secondResolved] = await Promise.all([
      firstPromise!,
      secondPromise!,
    ]);

    const expected = {
      profile: {
        id: "user-2",
        displayName: "Juan Pérez",
        role: "operario",
        isSharedDevice: false,
      },
      verified: true,
    };
    expect(firstResolved).toEqual(expected);
    expect(secondResolved).toEqual(expected);
  });

  it("muestra error y mantiene el modal abierto si el PIN no coincide con ningún operario", async () => {
    useSyncStatusStore.getState().setConnectivity("online");
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
    useSyncStatusStore.getState().setConnectivity("online");
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

  describe("sin conexión en dispositivo compartido", () => {
    it("abre el selector offline en vez de pedir PIN y carga los operarios cacheados", async () => {
      useSyncStatusStore.getState().setConnectivity("offline");
      useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
      const operarios = [
        { id: "op-1", displayName: "Juan Pérez", role: "operario" as const, isSharedDevice: false },
      ];
      mockGetOperarios.mockResolvedValue(operarios);
      const { result } = renderHook(() => useIdentityGate());

      act(() => {
        void result.current.requireIdentity();
      });

      expect(result.current.isPinPromptVisible).toBe(false);
      expect(result.current.isOfflineActorPickerVisible).toBe(true);

      await waitFor(() =>
        expect(result.current.offlineOperarios).toEqual(operarios),
      );
    });

    it("resuelve con verified:false al elegir un operario de la lista offline", async () => {
      useSyncStatusStore.getState().setConnectivity("offline");
      useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
      const operario = {
        id: "op-1",
        displayName: "Juan Pérez",
        role: "operario" as const,
        isSharedDevice: false,
      };
      mockGetOperarios.mockResolvedValue([operario]);
      const { result } = renderHook(() => useIdentityGate());

      let identityPromise: Promise<unknown>;
      act(() => {
        identityPromise = result.current.requireIdentity();
      });
      await waitFor(() =>
        expect(result.current.isLoadingOfflineOperarios).toBe(false),
      );

      act(() => {
        result.current.submitOfflineActor(operario);
      });

      const resolved = await identityPromise!;

      expect(resolved).toEqual({ profile: operario, verified: false });
      expect(result.current.isOfflineActorPickerVisible).toBe(false);
      // No se cachea como resolvedActor: cada acción offline vuelve a preguntar.
      expect(useIdentityStore.getState().resolvedActor).toBeNull();
    });

    it("una segunda llamada mientras el selector offline ya está abierto se une a la misma espera, sin recargar la lista", async () => {
      useSyncStatusStore.getState().setConnectivity("offline");
      useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
      const operario = {
        id: "op-1",
        displayName: "Juan Pérez",
        role: "operario" as const,
        isSharedDevice: false,
      };
      mockGetOperarios.mockResolvedValue([operario]);
      const { result } = renderHook(() => useIdentityGate());

      let firstPromise: Promise<unknown>;
      let secondPromise: Promise<unknown>;
      act(() => {
        firstPromise = result.current.requireIdentity();
        secondPromise = result.current.requireIdentity();
      });
      await waitFor(() =>
        expect(result.current.isLoadingOfflineOperarios).toBe(false),
      );

      expect(mockGetOperarios).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.submitOfflineActor(operario);
      });

      const [firstResolved, secondResolved] = await Promise.all([
        firstPromise!,
        secondPromise!,
      ]);

      const expected = { profile: operario, verified: false };
      expect(firstResolved).toEqual(expected);
      expect(secondResolved).toEqual(expected);
    });

    it("resuelve a null si se cancela el selector offline", async () => {
      useSyncStatusStore.getState().setConnectivity("offline");
      useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
      const { result } = renderHook(() => useIdentityGate());

      let identityPromise: Promise<unknown>;
      act(() => {
        identityPromise = result.current.requireIdentity();
      });

      act(() => {
        result.current.cancelOfflineActorPicker();
      });

      const resolved = await identityPromise!;

      expect(resolved).toBeNull();
      expect(result.current.isOfflineActorPickerVisible).toBe(false);
    });
  });

  describe("releaseIdentity", () => {
    it("limpia el resolvedActor en dispositivo compartido, forzando pedir PIN de nuevo en la siguiente acción", async () => {
      useSyncStatusStore.getState().setConnectivity("online");
      useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
      mockRpc.mockResolvedValue({
        data: [{ id: "user-2", display_name: "Juan Pérez", role: "operario" }],
        error: null,
      });
      const { result } = renderHook(() => useIdentityGate());

      act(() => {
        void result.current.requireIdentity();
      });
      await act(async () => {
        await result.current.submitPin("1234");
      });
      expect(useIdentityStore.getState().resolvedActor).not.toBeNull();

      act(() => {
        result.current.releaseIdentity();
      });

      expect(useIdentityStore.getState().resolvedActor).toBeNull();

      // La siguiente acción (misma persona u otra) vuelve a pedir PIN.
      act(() => {
        void result.current.requireIdentity();
      });
      expect(result.current.isPinPromptVisible).toBe(true);
    });

    it("no hace nada en cuentas personales (la identidad dura toda la sesión)", async () => {
      useIdentityStore.getState().setOwnProfile(personalProfile);
      const { result } = renderHook(() => useIdentityGate());

      act(() => {
        result.current.releaseIdentity();
      });

      expect(useIdentityStore.getState().resolvedActor).toEqual(
        personalProfile,
      );

      let resolved: unknown;
      await act(async () => {
        resolved = await result.current.requireIdentity();
      });
      expect(resolved).toEqual({ profile: personalProfile, verified: true });
      expect(result.current.isPinPromptVisible).toBe(false);
    });
  });
});
