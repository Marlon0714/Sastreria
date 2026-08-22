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

// Disuasivo simple para una tablet compartida — no un control de seguridad
// completo. No necesita persistir entre reinicios de la app.
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 30 * 1000;

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
  // Cola, no un solo slot: si `requireIdentity()` se llama más de una vez
  // mientras ya hay un prompt/selector abierto (ej. doble tap), todas las
  // llamadas se suman a la misma espera en vez de que la última pise a la
  // anterior — de lo contrario la primera nunca se resuelve y queda
  // colgada para siempre.
  const pendingResolversRef = useRef<PendingResolve[]>([]);
  const isPinPromptVisibleRef = useRef(false);
  const isOfflineActorPickerVisibleRef = useRef(false);
  // Disuasivo de intentos de PIN — en memoria, no necesita persistir entre
  // reinicios de la app. Se resetea al acertar o al cerrar/reabrir el modal
  // para una acción distinta.
  const pinAttemptsRef = useRef(0);
  const pinLockoutUntilRef = useRef<number | null>(null);

  const resetPinAttempts = useCallback((): void => {
    pinAttemptsRef.current = 0;
    pinLockoutUntilRef.current = null;
  }, []);

  const registerFailedPinAttempt = useCallback((): void => {
    pinAttemptsRef.current += 1;
    if (pinAttemptsRef.current >= MAX_PIN_ATTEMPTS) {
      pinLockoutUntilRef.current = Date.now() + PIN_LOCKOUT_MS;
      setPinError(
        "Demasiados intentos fallidos. Espera 30 segundos e intenta de nuevo.",
      );
    } else {
      setPinError("PIN incorrecto. Intenta de nuevo.");
    }
  }, []);

  const resolveAllPending = useCallback(
    (identity: ResolvedIdentity | null): void => {
      const resolvers = pendingResolversRef.current;
      pendingResolversRef.current = [];
      resolvers.forEach((resolve) => resolve(identity));
    },
    [],
  );

  const openOfflineActorPicker = useCallback((): Promise<ResolvedIdentity | null> => {
    isOfflineActorPickerVisibleRef.current = true;
    setIsOfflineActorPickerVisible(true);
    setIsLoadingOfflineOperarios(true);

    getDefaultProfilesCacheRepository()
      .getOperarios()
      .then(setOfflineOperarios)
      .catch(() => setOfflineOperarios([]))
      .finally(() => setIsLoadingOfflineOperarios(false));

    return new Promise((resolve) => {
      pendingResolversRef.current.push(resolve);
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

    // Ya hay un prompt/selector abierto esperando respuesta: no abrir uno
    // nuevo (ni re-disparar la carga de operarios offline), solo unirse a
    // la misma espera.
    if (isPinPromptVisibleRef.current || isOfflineActorPickerVisibleRef.current) {
      return new Promise((resolve) => {
        pendingResolversRef.current.push(resolve);
      });
    }

    if (useSyncStatusStore.getState().connectivity === "offline") {
      return openOfflineActorPicker();
    }

    setPinError(null);
    resetPinAttempts();
    isPinPromptVisibleRef.current = true;
    setIsPinPromptVisible(true);

    return new Promise((resolve) => {
      pendingResolversRef.current.push(resolve);
    });
  }, [ownProfile, resolvedActor, openOfflineActorPicker, resetPinAttempts]);

  const submitPin = useCallback(
    async (pin: string): Promise<void> => {
      const now = Date.now();
      if (pinLockoutUntilRef.current !== null) {
        if (now < pinLockoutUntilRef.current) {
          setPinError(
            "Demasiados intentos fallidos. Espera 30 segundos e intenta de nuevo.",
          );
          return;
        }
        // El cooldown ya terminó: se permite un nuevo intento desde cero.
        resetPinAttempts();
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc("resolve_operario_by_pin", {
          candidate_pin: pin,
        });

        if (error) {
          setPinError(
            "No se pudo verificar el PIN. Revisa tu conexión e intenta de nuevo.",
          );
          return;
        }

        const row = (data as ResolveOperarioByPinRow[] | null)?.[0];

        if (!row) {
          registerFailedPinAttempt();
          return;
        }

        const resolvedProfile: Profile = {
          id: row.id,
          displayName: row.display_name,
          role: row.role,
          isSharedDevice: false,
        };

        setResolvedActor(resolvedProfile);
        resetPinAttempts();
        isPinPromptVisibleRef.current = false;
        setIsPinPromptVisible(false);
        resolveAllPending({ profile: resolvedProfile, verified: true });
      } catch {
        setPinError(
          "No se pudo verificar el PIN. Revisa tu conexión e intenta de nuevo.",
        );
      }
    },
    [setResolvedActor, resolveAllPending, resetPinAttempts, registerFailedPinAttempt],
  );

  const cancelPinPrompt = useCallback((): void => {
    isPinPromptVisibleRef.current = false;
    setIsPinPromptVisible(false);
    resetPinAttempts();
    resolveAllPending(null);
  }, [resolveAllPending, resetPinAttempts]);

  const submitOfflineActor = useCallback(
    (profile: Profile): void => {
      isOfflineActorPickerVisibleRef.current = false;
      setIsOfflineActorPickerVisible(false);
      resolveAllPending({ profile, verified: false });
    },
    [resolveAllPending],
  );

  const cancelOfflineActorPicker = useCallback((): void => {
    isOfflineActorPickerVisibleRef.current = false;
    setIsOfflineActorPickerVisible(false);
    resolveAllPending(null);
  }, [resolveAllPending]);

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
