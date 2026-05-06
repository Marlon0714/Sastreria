import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import { useAuth } from "./useAuth";

// Silence console.error from expected thrown errors
jest.spyOn(console, "error").mockImplementation(() => {});

jest.mock("../../../data/supabase/config", () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));

import { isSupabaseConfigured } from "../../../data/supabase/config";
const mockIsConfigured = isSupabaseConfigured as jest.MockedFunction<
  typeof isSupabaseConfigured
>;

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
    ...overrides,
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
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
    });

    it("marca isAuthenticated en true cuando hay sesión válida previa", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAuth(repo));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
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
  });

  describe("signIn", () => {
    it("autentica al usuario con credenciales correctas", async () => {
      const repo = makeRepo();
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(repo.signIn).toHaveBeenCalledWith(
        "user@example.com",
        "password123",
      );
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
    it("cierra sesión correctamente", async () => {
      const repo = makeRepo({
        hasValidSession: jest
          .fn<SupabaseAuthRepositoryPort["hasValidSession"]>()
          .mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAuth(repo));
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(repo.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
