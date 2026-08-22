import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useAccountActions } from "./useAccountActions";

type MockError = { message: string } | null;

const mockGetUser =
  jest.fn<() => Promise<{ data: { user: { email: string } | null } }>>();
const mockUpdateUser =
  jest.fn<(payload: unknown) => Promise<{ error: MockError }>>();
const mockRpc =
  jest.fn<
    (name: string, params: unknown) => Promise<{ data: unknown; error: MockError }>
  >();

jest.mock("../../../data/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      updateUser: (payload: unknown) => mockUpdateUser(payload),
    },
    rpc: (name: string, params: unknown) => mockRpc(name, params),
  }),
}));

describe("useAccountActions", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUpdateUser.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { email: "juan@example.com" } },
    });
  });

  it("carga el correo actual al montar", async () => {
    const { result } = renderHook(() => useAccountActions());

    await waitFor(() => expect(result.current.isLoadingEmail).toBe(false));

    expect(result.current.currentEmail).toBe("juan@example.com");
  });

  it("changeEmail llama a auth.updateUser con el correo nuevo", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAccountActions());
    await waitFor(() => expect(result.current.isLoadingEmail).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.changeEmail("nuevo@example.com");
    });

    expect(ok).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: "nuevo@example.com" });
  });

  it("changePassword retorna false y expone el error si Supabase falla", async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: "Password should be at least 6 characters" },
    });
    const { result } = renderHook(() => useAccountActions());
    await waitFor(() => expect(result.current.isLoadingEmail).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.changePassword("123");
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe(
      "Password should be at least 6 characters",
    );
  });

  it("clearError limpia el error de un intento anterior", async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: "Password should be at least 6 characters" },
    });
    const { result } = renderHook(() => useAccountActions());
    await waitFor(() => expect(result.current.isLoadingEmail).toBe(false));

    await act(async () => {
      await result.current.changePassword("123");
    });
    expect(result.current.error).toBe(
      "Password should be at least 6 characters",
    );

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("changePin llama al RPC set_own_pin (sin id de operario)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useAccountActions());
    await waitFor(() => expect(result.current.isLoadingEmail).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.changePin("5678");
    });

    expect(ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("set_own_pin", {
      candidate_pin: "5678",
    });
  });
});
