import { beforeEach, describe, expect, it } from "@jest/globals";

import { useIdentityStore } from "./identityStore";

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

const resolvedOperario = {
  id: "user-2",
  displayName: "Juan Pérez",
  role: "operario" as const,
  isSharedDevice: false,
};

describe("identityStore", () => {
  beforeEach(() => {
    useIdentityStore.getState().reset();
  });

  it("empieza sin ownProfile ni resolvedActor", () => {
    const state = useIdentityStore.getState();
    expect(state.ownProfile).toBeNull();
    expect(state.resolvedActor).toBeNull();
  });

  it("resuelve resolvedActor a ownProfile cuando no es dispositivo compartido", () => {
    useIdentityStore.getState().setOwnProfile(personalProfile);

    const state = useIdentityStore.getState();
    expect(state.ownProfile).toEqual(personalProfile);
    expect(state.resolvedActor).toEqual(personalProfile);
  });

  it("deja resolvedActor en null cuando el perfil es de dispositivo compartido", () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);

    const state = useIdentityStore.getState();
    expect(state.ownProfile).toEqual(sharedDeviceProfile);
    expect(state.resolvedActor).toBeNull();
  });

  it("permite fijar resolvedActor explícitamente (ej. tras validar un PIN)", () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    useIdentityStore.getState().setResolvedActor(resolvedOperario);

    expect(useIdentityStore.getState().resolvedActor).toEqual(
      resolvedOperario,
    );
  });

  it("clearResolvedActor limpia solo el actor, no el ownProfile", () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    useIdentityStore.getState().setResolvedActor(resolvedOperario);

    useIdentityStore.getState().clearResolvedActor();

    const state = useIdentityStore.getState();
    expect(state.ownProfile).toEqual(sharedDeviceProfile);
    expect(state.resolvedActor).toBeNull();
  });

  it("setOwnProfile(null) limpia ambos campos", () => {
    useIdentityStore.getState().setOwnProfile(personalProfile);

    useIdentityStore.getState().setOwnProfile(null);

    const state = useIdentityStore.getState();
    expect(state.ownProfile).toBeNull();
    expect(state.resolvedActor).toBeNull();
  });

  it("reset vuelve al estado inicial", () => {
    useIdentityStore.getState().setOwnProfile(sharedDeviceProfile);
    useIdentityStore.getState().setResolvedActor(resolvedOperario);

    useIdentityStore.getState().reset();

    const state = useIdentityStore.getState();
    expect(state.ownProfile).toBeNull();
    expect(state.resolvedActor).toBeNull();
  });
});
