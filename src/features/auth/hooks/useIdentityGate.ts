import { useCallback, useRef, useState } from "react";

import { getSupabaseClient } from "../../../data/supabase/client";
import { useIdentityStore } from "../../../shared/state/identityStore";
import type { Profile, Role } from "../domain/profile";

interface ResolveOperarioByPinRow {
  id: string;
  display_name: string;
  role: Role;
}

interface UseIdentityGateResult {
  /**
   * Resuelve quién debe figurar como autor de la acción actual. Si la sesión
   * no es de dispositivo compartido, retorna `ownProfile` de inmediato. Si lo
   * es, abre el `PinPromptModal` (a través de `isPinPromptVisible`) y espera
   * a que se valide un PIN o se cancele.
   */
  requireIdentity: () => Promise<Profile | null>;
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
  const pendingResolveRef = useRef<((profile: Profile | null) => void) | null>(
    null,
  );

  const requireIdentity = useCallback((): Promise<Profile | null> => {
    if (!ownProfile?.isSharedDevice) {
      return Promise.resolve(ownProfile);
    }

    if (resolvedActor) {
      return Promise.resolve(resolvedActor);
    }

    setPinError(null);
    setIsPinPromptVisible(true);

    return new Promise((resolve) => {
      pendingResolveRef.current = resolve;
    });
  }, [ownProfile, resolvedActor]);

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
      pendingResolveRef.current?.(resolvedProfile);
      pendingResolveRef.current = null;
    },
    [setResolvedActor],
  );

  const cancelPinPrompt = useCallback((): void => {
    setIsPinPromptVisible(false);
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
  };
}
