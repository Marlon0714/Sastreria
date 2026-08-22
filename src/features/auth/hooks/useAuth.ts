import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import {
  AuthNetworkError,
  SupabaseAuthRepository,
} from "../../../data/supabase/SupabaseAuthRepository";
import { isSupabaseConfigured } from "../../../data/supabase/config";
import { useIdentityStore } from "../../../shared/state/identityStore";
import type { Profile } from "../domain/profile";

const PROFILE_CACHE_KEY = "sastreria_cached_profile";
// Cuánto se confía en el perfil cacheado sin conexión antes de dejar de
// usarlo. Sin este límite, un cambio de `is_shared_device` hecho en Supabase
// (ej. el dispositivo pasa a ser la tablet compartida del mostrador) nunca
// se aplicaría en un dispositivo que se quede sin red indefinidamente: el
// gate de PIN se seguiría saltando para siempre con el valor viejo cacheado.
const PROFILE_CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72h

interface AuthState {
  isAuthenticated: boolean;
  /** Solo la comprobación inicial de sesión guardada al montar la app. */
  isLoading: boolean;
  /**
   * Solo mientras corre signIn() — separado de `isLoading` a propósito:
   * RootNavigator usa `isLoading` para decidir si desmonta TODO (incluida
   * la pantalla de login) mientras carga la sesión inicial. Si signIn()
   * reusara ese mismo flag, tocar "Iniciar sesión" desmontaría la propia
   * pantalla de login a mitad del intento — pantalla en blanco y, si el
   * login falla, el formulario reaparece vacío (nuevo montaje de
   * react-hook-form) obligando a re-escribir todo.
   */
  isSigningIn: boolean;
  error: string | null;
  profile: Profile | null;
}

interface UseAuthResult extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface CachedProfileEntry {
  profile: Profile;
  cachedAt: number;
}

const defaultRepo = new SupabaseAuthRepository();

async function loadCachedProfile(): Promise<Profile | null> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as Partial<CachedProfileEntry>;
    if (typeof entry.cachedAt !== "number" || !entry.profile) {
      // Formato viejo (perfil crudo sin `cachedAt`) o dato corrupto: se trata
      // como vencido en vez de confiar en él indefinidamente.
      return null;
    }

    if (Date.now() - entry.cachedAt > PROFILE_CACHE_TTL_MS) {
      return null;
    }

    return entry.profile;
  } catch {
    return null;
  }
}

async function cacheProfile(profile: Profile | null): Promise<void> {
  try {
    if (profile) {
      const entry: CachedProfileEntry = { profile, cachedAt: Date.now() };
      await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(entry));
    } else {
      await SecureStore.deleteItemAsync(PROFILE_CACHE_KEY);
    }
  } catch {
    // El caché es best-effort: la sesión en vivo sigue siendo la fuente de verdad.
  }
}

export function useAuth(
  repo: SupabaseAuthRepositoryPort = defaultRepo,
): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const setOwnProfile = useIdentityStore((state) => state.setOwnProfile);

  const applyProfile = useCallback(
    (nextProfile: Profile | null): void => {
      setProfile(nextProfile);
      setOwnProfile(nextProfile);
    },
    [setOwnProfile],
  );

  const resolveProfileForSession = useCallback(
    /**
     * `requireResolution` distingue el arranque en frío (aceptable seguir
     * con el perfil cacheado aunque el fetch fresco falle, incluso si no
     * hay caché — ya existía una sesión válida) del login nuevo en
     * `signIn()`: ahí, si el fetch falla Y no hay ninguna caché vigente
     * (no vencida), no hay ninguna base para confiar en `role` y se debe
     * tratar como fallo de login en vez de dejar pasar un perfil `null`
     * que expondría las pestañas de dueño (`role === null` se interpreta
     * como "no restringir" en modo local-only).
     */
    async (userId: string, options?: { requireResolution?: boolean }): Promise<void> => {
      try {
        const fetched = await repo.getProfile(userId);
        applyProfile(fetched);
        await cacheProfile(fetched);
      } catch {
        const cached = await loadCachedProfile();
        if (cached) {
          applyProfile(cached);
          return;
        }

        applyProfile(null);

        if (options?.requireResolution) {
          throw new Error(
            "No se pudo verificar tu cuenta. Revisa tu conexión e intenta de nuevo.",
          );
        }
      }
    },
    [repo, applyProfile],
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    repo
      .hasValidSession()
      .then(async (valid) => {
        setIsAuthenticated(valid);

        if (!valid) {
          return;
        }

        const session = await repo.getSession();
        if (session) {
          await resolveProfileForSession(session.userId);
        }
      })
      .catch(async (err: unknown) => {
        if (err instanceof AuthNetworkError) {
          // Sin red justo cuando el access token expiró: no hay forma de
          // confirmar si la sesión sigue viva. En vez de mandar a un
          // operario legítimo al login (que requiere conexión), confiamos
          // en el perfil cacheado (TTL 72h) si todavía es válido.
          const cached = await loadCachedProfile();
          if (cached) {
            applyProfile(cached);
            setIsAuthenticated(true);
            return;
          }
        }

        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repo, resolveProfileForSession, applyProfile]);

  // Detecta cuando Supabase invalida la sesión por su cuenta (ej. refresh
  // token muerto tras estar mucho tiempo sin red) — sin este listener la app
  // sigue "creyendo" que está logueada mientras cada escritura a la nube
  // falla en silencio, y nunca vuelve a mostrar el login.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const unsubscribe = repo.onAuthStateChange((hasSession) => {
      if (!hasSession) {
        setIsAuthenticated(false);
        applyProfile(null);
        void cacheProfile(null);
      }
    });

    return unsubscribe;
  }, [repo, applyProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsSigningIn(true);
      try {
        const session = await repo.signIn(email, password);
        // Resuelve el perfil ANTES de marcar autenticado — si no, el tab
        // navigator monta con role=null (muestra las 4 pestañas) y un
        // instante después el perfil resuelve a "operario" y la lista baja
        // a 2 pestañas, lo que deja el gesture-handler del tab navigator
        // desincronizado (no responde a toques hasta cambiar de pestaña a
        // mano). Al reabrir la app con sesión ya guardada esto no pasaba
        // porque ese flujo ya esperaba resolveProfileForSession antes de
        // marcar isLoading=false.
        await resolveProfileForSession(session.userId, {
          requireResolution: true,
        });
        setIsAuthenticated(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al iniciar sesión.",
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [repo, resolveProfileForSession],
  );

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await repo.signOut();
      setIsAuthenticated(false);
      applyProfile(null);
      await cacheProfile(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cerrar sesión. Intenta de nuevo.",
      );
      throw err;
    }
  }, [repo, applyProfile]);

  return {
    isAuthenticated,
    isLoading,
    isSigningIn,
    error,
    profile,
    signIn,
    signOut,
  };
}
