import { renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { useOwnerOnlyVisibility } from "./useOwnerOnlyVisibility";

describe("useOwnerOnlyVisibility", () => {
  beforeEach(() => {
    useIdentityStore.getState().reset();
  });

  it("retorna true para role=owner", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });

    const { result } = renderHook(() => useOwnerOnlyVisibility());

    expect(result.current).toBe(true);
  });

  it("retorna false para role=operario en su propio dispositivo", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "operario-1",
      displayName: "Operario",
      role: "operario",
      isSharedDevice: false,
    });

    const { result } = renderHook(() => useOwnerOnlyVisibility());

    expect(result.current).toBe(false);
  });

  it("retorna true para role=operario en el dispositivo compartido del mostrador", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "tablet-1",
      displayName: "Tablet mostrador",
      role: "operario",
      isSharedDevice: true,
    });

    const { result } = renderHook(() => useOwnerOnlyVisibility());

    expect(result.current).toBe(true);
  });

  it("retorna true si el perfil aún no se resolvió (role=null)", () => {
    const { result } = renderHook(() => useOwnerOnlyVisibility());

    expect(result.current).toBe(true);
  });
});
