import { create } from "zustand";

import type { Profile } from "../../features/auth/domain/profile";

interface IdentityState {
  /** Perfil de quien inició sesión en este dispositivo. */
  ownProfile: Profile | null;
  /**
   * A quién atribuir la acción actual. Igual a `ownProfile` salvo que el
   * dispositivo sea compartido (`ownProfile.isSharedDevice`), en cuyo caso
   * es quien haya validado su PIN en esta sesión de app, o `null` si nadie
   * lo ha hecho aún.
   */
  resolvedActor: Profile | null;
  setOwnProfile: (profile: Profile | null) => void;
  setResolvedActor: (profile: Profile | null) => void;
  clearResolvedActor: () => void;
  reset: () => void;
}

function deriveResolvedActor(profile: Profile | null): Profile | null {
  if (!profile || profile.isSharedDevice) {
    return null;
  }

  return profile;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  ownProfile: null,
  resolvedActor: null,
  setOwnProfile: (profile): void => {
    set({ ownProfile: profile, resolvedActor: deriveResolvedActor(profile) });
  },
  setResolvedActor: (profile): void => {
    set({ resolvedActor: profile });
  },
  clearResolvedActor: (): void => {
    set({ resolvedActor: null });
  },
  reset: (): void => {
    set({ ownProfile: null, resolvedActor: null });
  },
}));
