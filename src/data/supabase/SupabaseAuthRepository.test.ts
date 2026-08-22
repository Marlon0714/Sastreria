import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthRetryableFetchError } from "@supabase/supabase-js";

import { AuthNetworkError, SupabaseAuthRepository } from "./SupabaseAuthRepository";

type MockError = { message: string } | null;

const mockSignInWithPassword =
  jest.fn<
    () => Promise<{
      data: { session: unknown };
      error: MockError;
    }>
  >();
const mockSignOut = jest.fn<() => Promise<{ error: MockError }>>();
const mockGetSession =
  jest.fn<
    () => Promise<{
      data: { session: unknown };
      error: MockError;
    }>
  >();

const mockMaybeSingle =
  jest.fn<() => Promise<{ data: unknown; error: MockError }>>();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockUnsubscribe = jest.fn();
const mockOnAuthStateChange = jest.fn(
  (
    _callback: (
      event: string,
      session: { user: { id: string } } | null,
    ) => void,
  ) => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  }),
);

jest.mock("./client", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  }),
}));

const fakeSession = {
  user: { id: "user-1" },
  access_token: "token-abc",
};

describe("SupabaseAuthRepository", () => {
  let repo: SupabaseAuthRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new SupabaseAuthRepository();
  });

  describe("signIn", () => {
    it("retorna la sesión mapeada cuando las credenciales son correctas", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: fakeSession },
        error: null,
      });

      const result = await repo.signIn("user@example.com", "password123");

      expect(result).toEqual({ userId: "user-1", accessToken: "token-abc" });
    });

    it("lanza un error sanitizado (sin credenciales) cuando falla", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      });

      await expect(
        repo.signIn("user@example.com", "wrong"),
      ).rejects.toThrow("[auth] Sign in failed. Check credentials and try again.");
    });

    it("lanza un mensaje de red distinto cuando el fallo es de conectividad", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: new AuthRetryableFetchError("Failed to fetch", 0),
      });

      await expect(
        repo.signIn("user@example.com", "password123"),
      ).rejects.toThrow(
        "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
      );
    });
  });

  describe("signOut", () => {
    it("resuelve sin error cuando el signOut es exitoso", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await expect(repo.signOut()).resolves.toBeUndefined();
    });

    it("lanza un error cuando el signOut falla", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "network error" } });

      await expect(repo.signOut()).rejects.toThrow("[auth] Sign out failed.");
    });
  });

  describe("getSession", () => {
    it("retorna la sesión mapeada cuando existe", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: fakeSession },
        error: null,
      });

      const result = await repo.getSession();

      expect(result).toEqual({ userId: "user-1", accessToken: "token-abc" });
    });

    it("retorna null cuando no hay sesión", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const result = await repo.getSession();

      expect(result).toBeNull();
    });

    it("retorna null cuando hay error", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: "boom" },
      });

      const result = await repo.getSession();

      expect(result).toBeNull();
    });

    it("lanza AuthNetworkError (no retorna null) cuando el refresh falla por conectividad", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new AuthRetryableFetchError("Failed to fetch", 0),
      });

      await expect(repo.getSession()).rejects.toBeInstanceOf(AuthNetworkError);
    });
  });

  describe("hasValidSession", () => {
    it("retorna true si hay sesión activa", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: fakeSession },
        error: null,
      });

      await expect(repo.hasValidSession()).resolves.toBe(true);
    });

    it("retorna false si no hay sesión", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      await expect(repo.hasValidSession()).resolves.toBe(false);
    });

    it("propaga AuthNetworkError en vez de resolver false cuando el refresh falla por conectividad", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new AuthRetryableFetchError("Failed to fetch", 0),
      });

      await expect(repo.hasValidSession()).rejects.toBeInstanceOf(
        AuthNetworkError,
      );
    });
  });

  describe("getProfile", () => {
    it("mapea la fila de profiles correctamente", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: "user-1",
          display_name: "María Gómez",
          role: "operario",
          is_shared_device: false,
        },
        error: null,
      });

      const result = await repo.getProfile("user-1");

      expect(result).toEqual({
        id: "user-1",
        displayName: "María Gómez",
        role: "operario",
        isSharedDevice: false,
      });
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockEq).toHaveBeenCalledWith("id", "user-1");
    });

    it("retorna null si no existe el perfil", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.getProfile("user-unknown");

      expect(result).toBeNull();
    });

    it("retorna null si la consulta falla", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      const result = await repo.getProfile("user-1");

      expect(result).toBeNull();
    });
  });

  describe("onAuthStateChange", () => {
    it("invoca el callback con hasSession=true cuando llega una sesión", () => {
      const callback = jest.fn();
      repo.onAuthStateChange(callback);

      const [registered] = mockOnAuthStateChange.mock.calls[0] ?? [];
      registered?.("SIGNED_IN", fakeSession);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it("invoca el callback con hasSession=false cuando la sesión se pierde", () => {
      const callback = jest.fn();
      repo.onAuthStateChange(callback);

      const [registered] = mockOnAuthStateChange.mock.calls[0] ?? [];
      registered?.("SIGNED_OUT", null);

      expect(callback).toHaveBeenCalledWith(false);
    });

    it("retorna una función que cancela la suscripción", () => {
      const unsubscribe = repo.onAuthStateChange(jest.fn());
      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
