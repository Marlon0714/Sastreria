import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { useReauth } from "./useReauth";

type MockError = { message: string } | null;

const mockGetUser =
  jest.fn<() => Promise<{ data: { user: { email: string } | null }; error: MockError }>>();
const mockSignInWithPassword =
  jest.fn<() => Promise<{ error: MockError }>>();
const mockRpc = jest.fn<() => Promise<{ data: unknown; error: MockError }>>();

jest.mock("../../../data/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      signInWithPassword: () => mockSignInWithPassword(),
    },
    rpc: () => mockRpc(),
  }),
}));

describe("useReauth", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSignInWithPassword.mockReset();
    mockRpc.mockReset();
    useIdentityStore.getState().reset();
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
  });

  describe("verifyPassword", () => {
    it("retorna true si signInWithPassword no da error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: "juan@example.com" } },
        error: null,
      });
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useReauth());
      let ok = false;
      await act(async () => {
        ok = await result.current.verifyPassword("secreta");
      });

      expect(ok).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("retorna false y setea error si la contraseña es incorrecta", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: "juan@example.com" } },
        error: null,
      });
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid credentials" },
      });

      const { result } = renderHook(() => useReauth());
      let ok = true;
      await act(async () => {
        ok = await result.current.verifyPassword("mala");
      });

      expect(ok).toBe(false);
      expect(result.current.error).toBe("Contraseña incorrecta.");
    });
  });

  describe("verifyPin", () => {
    it("retorna true si el PIN resuelve al propio perfil", async () => {
      mockRpc.mockResolvedValue({
        data: [{ id: "op-1", display_name: "Juan Pérez", role: "operario" }],
        error: null,
      });

      const { result } = renderHook(() => useReauth());
      let ok = false;
      await act(async () => {
        ok = await result.current.verifyPin("1234");
      });

      expect(ok).toBe(true);
    });

    it("retorna false si el PIN resuelve a OTRO operario (no puede confirmar con el PIN de otro)", async () => {
      mockRpc.mockResolvedValue({
        data: [{ id: "op-2", display_name: "Otra Persona", role: "operario" }],
        error: null,
      });

      const { result } = renderHook(() => useReauth());
      let ok = true;
      await act(async () => {
        ok = await result.current.verifyPin("1234");
      });

      expect(ok).toBe(false);
      expect(result.current.error).toBe("PIN incorrecto.");
    });

    it("retorna false si el PIN no resuelve a nadie", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useReauth());
      let ok = true;
      await act(async () => {
        ok = await result.current.verifyPin("0000");
      });

      expect(ok).toBe(false);
    });
  });
});
