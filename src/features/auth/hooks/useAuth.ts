import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import { SupabaseAuthRepository } from "../../../data/supabase/SupabaseAuthRepository";
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
  isLoading: boolean;
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
    async (userId: string): Promise<void> => {
      try {
        const fetched = await repo.getProfile(userId);
        applyProfile(fetched);
        await cacheProfile(fetched);
      } catch {
        const cached = await loadCachedProfile();
        applyProfile(cached);
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
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repo, resolveProfileForSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsLoading(true);
      try {
        const session = await repo.signIn(email, password);
        setIsAuthenticated(true);
        await resolveProfileForSession(session.userId);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al iniciar sesión.",
        );
      } finally {
        setIsLoading(false);
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

  return { isAuthenticated, isLoading, error, profile, signIn, signOut };
}
