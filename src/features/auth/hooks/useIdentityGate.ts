import { useCallback, useRef, useState } from "react";

import { getDefaultProfilesCacheRepository } from "../../../data/local/profilesCacheDependencies";
import { getSupabaseClient } from "../../../data/supabase/client";
import { useIdentityStore } from "../../../shared/state/identityStore";
import { useSyncStatusStore } from "../../../shared/state/syncStatusStore";
import type { Profile, Role } from "../domain/profile";

interface ResolveOperarioByPinRow {
  id: string;
  display_name: string;
  role: Role;
}

/**
 * Resultado de resolver quién debe figurar como autor de una acción.
 * `verified: false` solo ocurre en dispositivo compartido sin conexión —
 * se eligió el operario de una lista local, sin poder validar un PIN.
 */
export interface ResolvedIdentity {
  profile: Profile;
  verified: boolean;
}

type PendingResolve = (identity: ResolvedIdentity | null) => void;

interface UseIdentityGateResult {
  /**
   * Resuelve quién debe figurar como autor de la acción actual. Si la sesión
   * no es de dispositivo compartido, retorna `ownProfile` de inmediato
   * (`verified: true`, no hay ambigüedad). Si es dispositivo compartido y
   * hay conexión, abre `PinPromptModal`. Si es dispositivo compartido y NO
   * hay conexión, abre el selector offline (`isOfflineActorPickerVisible`) —
   * no se puede validar un PIN sin la función RPC, así que se permite
   * elegir de una lista local y el resultado queda `verified: false`.
   */
  requireIdentity: () => Promise<ResolvedIdentity | null>;
  /**
   * Marca como terminada la acción que consumió la identidad resuelta por
   * PIN. En dispositivo compartido, cada PIN vale para UNA sola acción: se
   * debe llamar justo después de completarla (ej. al guardar el cambio de
   * estado) para que la siguiente acción — sea de la misma persona o de
   * otra que tome la tablet después — vuelva a pedir PIN. Evita que dos
   * trabajadores consecutivos en la misma tablet queden atribuidos al
   * mismo PIN sin darse cuenta. No hace nada en cuentas personales (ahí no
   * hay ambigüedad que resolver, la identidad dura toda la sesión).
   */
  releaseIdentity: () => void;
  isPinPromptVisible: boolean;
  pinError: string | null;
  submitPin: (pin: string) => Promise<void>;
  cancelPinPrompt: () => void;
  isOfflineActorPickerVisible: boolean;
  offlineOperarios: Profile[];
  isLoadingOfflineOperarios: boolean;
  submitOfflineActor: (profile: Profile) => void;
  cancelOfflineActorPicker: () => void;
}

export function useIdentityGate(): UseIdentityGateResult {
  const ownProfile = useIdentityStore((state) => state.ownProfile);
  const resolvedActor = useIdentityStore((state) => state.resolvedActor);
  const setResolvedActor = useIdentityStore((state) => state.setResolvedActor);
  const clearResolvedActor = useIdentityStore(
    (state) => state.clearResolvedActor,
  );

  const [isPinPromptVisible, setIsPinPromptVisible] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isOfflineActorPickerVisible, setIsOfflineActorPickerVisible] =
    useState(false);
  const [offlineOperarios, setOfflineOperarios] = useState<Profile[]>([]);
  const [isLoadingOfflineOperarios, setIsLoadingOfflineOperarios] =
    useState(false);
  const pendingResolveRef = useRef<PendingResolve | null>(null);

  const openOfflineActorPicker = useCallback((): Promise<ResolvedIdentity | null> => {
    setIsOfflineActorPickerVisible(true);
    setIsLoadingOfflineOperarios(true);

    getDefaultProfilesCacheRepository()
      .getOperarios()
      .then(setOfflineOperarios)
      .catch(() => setOfflineOperarios([]))
      .finally(() => setIsLoadingOfflineOperarios(false));

    return new Promise((resolve) => {
      pendingResolveRef.current = resolve;
    });
  }, []);

  const requireIdentity = useCallback((): Promise<ResolvedIdentity | null> => {
    if (!ownProfile) {
      return Promise.resolve(null);
    }

    if (!ownProfile.isSharedDevice) {
      return Promise.resolve({ profile: ownProfile, verified: true });
    }

    if (resolvedActor) {
      return Promise.resolve({ profile: resolvedActor, verified: true });
    }

    if (useSyncStatusStore.getState().connectivity === "offline") {
      return openOfflineActorPicker();
    }

    setPinError(null);
    setIsPinPromptVisible(true);

    return new Promise((resolve) => {
      pendingResolveRef.current = resolve;
    });
  }, [ownProfile, resolvedActor, openOfflineActorPicker]);

  const submitPin = useCallback(
    async (pin: string): Promise<void> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("resolve_operario_by_pin", {
        candidate_pin: pin,
      });

      const row = (data as ResolveOperarioByPinRow[] | null)?.[0];

      if (error || !row) {
        setPinError("PIN incorrecto. Intenta de nuevo.");
        return;
      }

      const resolvedProfile: Profile = {
        id: row.id,
        displayName: row.display_name,
        role: row.role,
        isSharedDevice: false,
      };

      setResolvedActor(resolvedProfile);
      setIsPinPromptVisible(false);
      pendingResolveRef.current?.({ profile: resolvedProfile, verified: true });
      pendingResolveRef.current = null;
    },
    [setResolvedActor],
  );

  const cancelPinPrompt = useCallback((): void => {
    setIsPinPromptVisible(false);
    pendingResolveRef.current?.(null);
    pendingResolveRef.current = null;
  }, []);

  const submitOfflineActor = useCallback((profile: Profile): void => {
    setIsOfflineActorPickerVisible(false);
    pendingResolveRef.current?.({ profile, verified: false });
    pendingResolveRef.current = null;
  }, []);

  const cancelOfflineActorPicker = useCallback((): void => {
    setIsOfflineActorPickerVisible(false);
    pendingResolveRef.current?.(null);
    pendingResolveRef.current = null;
  }, []);

  const releaseIdentity = useCallback((): void => {
    if (ownProfile?.isSharedDevice) {
      clearResolvedActor();
    }
  }, [ownProfile, clearResolvedActor]);

  return {
    requireIdentity,
    releaseIdentity,
    isPinPromptVisible,
    pinError,
    submitPin,
    cancelPinPrompt,
    isOfflineActorPickerVisible,
    offlineOperarios,
    isLoadingOfflineOperarios,
    submitOfflineActor,
    cancelOfflineActorPicker,
  };
}
