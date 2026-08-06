import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import { useAuth } from "./useAuth";
import { useIdentityStore } from "../../../shared/state/identityStore";

import { isSupabaseConfigured } from "../../../data/supabase/config";

// Silence console.error from expected thrown errors
jest.spyOn(console, "error").mockImplementation(() => {});

jest.mock("../../../data/supabase/config", () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));
const mockIsConfigured = isSupabaseConfigured as jest.MockedFunction<
  typeof isSupabaseConfigured
>;

const secureStoreData = new Map<string, string>();
const mockGetItemAsync = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItemAsync =
  jest.fn<(key: string, value: string) => Promise<void>>();
const mockDeleteItemAsync = jest.fn<(key: string) => Promise<void>>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string): Promise<string | null> =>
    mockGetItemAsync(key),
  setItemAsync: (key: string, value: string): Promise<void> =>
    mockSetItemAsync(key, value),
  deleteItemAsync: (key: string): Promise<void> => mockDeleteItemAsync(key),
}));

const testProfile = {
  id: "user-1",
  displayName: "María Gómez",
  role: "operario" as const,
  isSharedDevice: false,
};

function makeRepo(
  overrides: Partial<SupabaseAuthRepositoryPort> = {},
): SupabaseAuthRepositoryPort {
  return {
    signIn: jest.fn<SupabaseAuthRepositoryPort["signIn"]>().mockResolvedValue({
      userId: "user-1",
      accessToken: "token-abc",
    }),
    signOut: jest
      .fn<SupabaseAuthRepositoryPort["signOut"]>()
      .mockResolvedValue(undefined),
    getSession: jest
      .fn<SupabaseAuthRepositoryPort["getSession"]>()
      .mockResolvedValue(null),
    hasValidSession: jest
      .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
      .mockResolvedValue(false),
    getProfile: jest
      .fn<SupabaseAuthRepositoryPort["getProfile"]>()
      .mockResolvedValue(testProfile),
    onAuthStateChange: jest
      .fn<SupabaseAuthRepositoryPort["onAuthStateChange"]>()
      .mockReturnValue(() => {}),
    ...overrides,
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    secureStoreData.clear();
    mockGetItemAsync.mockImplementation((key) =>
      Promise.resolve(secureStoreData.get(key) ?? null),
    );
    mockSetItemAsync.mockImplementation((key, value) => {
      secureStoreData.set(key, value);
      return Promise.resolve();
    });
    mockDeleteItemAsync.mockImplementation((key) => {
      secureStoreData.delete(key);
      return Promise.resolve();
    });
    useIdentityStore.getState().reset();
  });

  describe("inicialización de sesión", () => {
    it("empieza en estado de carga y resuelve sin sesión activa", async () => {
      const repo = makeRepo();
      const { result } = renderHook(() => useAuth(repo));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it("marca isAuthenticated en true y carga el perfil cuando hay sesión válida previa", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.profile).toEqual(testProfile);
      expect(useIdentityStore.getState().ownProfile).toEqual(testProfile);
    });

    it("queda autenticado si Supabase no está configurado (modo offline)", async () => {
      mockIsConfigured.mockReturnValue(false);
      const repo = makeRepo();
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
      expect(repo.hasValidSession).not.toHaveBeenCalled();
    });

    it("queda no autenticado si hasValidSession lanza error", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockRejectedValue(new Error("network error")),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(false);
    });

    it("usa el perfil cacheado en SecureStore si getProfile falla", async () => {
      secureStoreData.set(
        "sastreria_cached_profile",
        JSON.stringify({ profile: testProfile, cachedAt: Date.now() }),
      );
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
        getProfile: jest
          .fn<SupabaseAuthRepositoryPort["getProfile"]>()
          .mockRejectedValue(new Error("network error")),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toEqual(testProfile);
    });

    it("ignora el perfil cacheado si ya venció el TTL de confianza offline", async () => {
      const seventyThreeHoursAgo = Date.now() - 73 * 60 * 60 * 1000;
      secureStoreData.set(
        "sastreria_cached_profile",
        JSON.stringify({ profile: testProfile, cachedAt: seventyThreeHoursAgo }),
      );
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
        getProfile: jest
          .fn<SupabaseAuthRepositoryPort["getProfile"]>()
          .mockRejectedValue(new Error("network error")),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toBeNull();
    });

    it("ignora un perfil cacheado en formato viejo (sin cachedAt)", async () => {
      secureStoreData.set(
        "sastreria_cached_profile",
        JSON.stringify(testProfile),
      );
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
        getProfile: jest
          .fn<SupabaseAuthRepositoryPort["getProfile"]>()
          .mockRejectedValue(new Error("network error")),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toBeNull();
    });
  });

  describe("signIn", () => {
    it("usa isSigningIn (no isLoading) mientras el login está en curso", async () => {
      // Regresión: RootNavigator desmonta TODO (incluida la pantalla de
      // login) mientras isLoading es true — si signIn() reusara ese mismo
      // flag, tocar "Iniciar sesión" causaría una pantalla en blanco y, si
      // fallara, el formulario reaparecería vacío al re-montarse.
      let resolveSignIn: ((value: { userId: string; accessToken: string }) => void) | undefined;
      const repo = makeRepo({
        signIn: jest.fn<SupabaseAuthRepositoryPort["signIn"]>(
          () =>
            new Promise((resolve) => {
              resolveSignIn = resolve;
            }),
        ),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let signInPromise: Promise<void> = Promise.resolve();
      act(() => {
        signInPromise = result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isSigningIn).toBe(true);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        resolveSignIn?.({ userId: "user-1", accessToken: "token-abc" });
        await signInPromise;
      });

      expect(result.current.isSigningIn).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("autentica al usuario con credenciales correctas y carga su perfil", async () => {
      const repo = makeRepo();
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.profile).toEqual(testProfile);
      expect(repo.signIn).toHaveBeenCalledWith(
        "user@example.com",
        "password123",
      );
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        "sastreria_cached_profile",
        expect.any(String),
      );
      const [, cachedRaw] = mockSetItemAsync.mock.calls.find(
        ([key]) => key === "sastreria_cached_profile",
      ) as [string, string];
      const cachedEntry = JSON.parse(cachedRaw) as {
        profile: unknown;
        cachedAt: number;
      };
      expect(cachedEntry.profile).toEqual(testProfile);
      expect(typeof cachedEntry.cachedAt).toBe("number");
    });

    it("guarda mensaje de error cuando las credenciales son incorrectas", async () => {
      const repo = makeRepo({
        signIn: jest
          .fn<SupabaseAuthRepositoryPort["signIn"]>()
          .mockRejectedValue(new Error("Credenciales incorrectas")),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe("Credenciales incorrectas");
    });

    it("usa mensaje genérico si el error no es instancia de Error", async () => {
      const repo = makeRepo({
        signIn: jest
          .fn<SupabaseAuthRepositoryPort["signIn"]>()
          .mockRejectedValue("string-error"),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(result.current.error).toBe("Error al iniciar sesión.");
    });

    it("limpia el error previo al intentar de nuevo", async () => {
      const signInMock = jest
        .fn<SupabaseAuthRepositoryPort["signIn"]>()
        .mockRejectedValueOnce(new Error("fallo 1"))
        .mockResolvedValueOnce({ userId: "u", accessToken: "t" });
      const repo = makeRepo({ signIn: signInMock });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });
      expect(result.current.error).toBe("fallo 1");

      await act(async () => {
        await result.current.signIn("user@example.com", "correct");
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("signOut", () => {
    it("cierra sesión correctamente y limpia el perfil", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
      await waitFor(() => expect(result.current.profile).toEqual(testProfile));

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(useIdentityStore.getState().ownProfile).toBeNull();
      expect(repo.signOut).toHaveBeenCalledTimes(1);
    });

    it("mantiene la sesión y expone un error si signOut falla", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
        signOut: jest
          .fn<SupabaseAuthRepositoryPort["signOut"]>()
          .mockRejectedValue(new Error("network error")),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
      await waitFor(() => expect(result.current.profile).toEqual(testProfile));

      await act(async () => {
        await expect(result.current.signOut()).rejects.toThrow(
          "network error",
        );
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.profile).toEqual(testProfile);
      expect(useIdentityStore.getState().ownProfile).toEqual(testProfile);
      expect(result.current.error).toBe("network error");
    });
  });

  describe("onAuthStateChange", () => {
    it("se desloguea solo cuando Supabase invalida la sesión sin pasar por signOut", async () => {
      let emitAuthStateChange: (hasSession: boolean) => void = () => {};
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
        getSession: jest
          .fn<SupabaseAuthRepositoryPort["getSession"]>()
          .mockResolvedValue({ userId: "user-1", accessToken: "token-abc" }),
        onAuthStateChange: jest
          .fn<SupabaseAuthRepositoryPort["onAuthStateChange"]>()
          .mockImplementation((callback) => {
            emitAuthStateChange = callback;
            return () => {};
          }),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
      await waitFor(() => expect(result.current.profile).toEqual(testProfile));

      act(() => {
        emitAuthStateChange(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(useIdentityStore.getState().ownProfile).toBeNull();
    });

    it("no se suscribe cuando Supabase no está configurado", async () => {
      mockIsConfigured.mockReturnValue(false);
      const repo = makeRepo();
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(repo.onAuthStateChange).not.toHaveBeenCalled();
    });
  });
});
