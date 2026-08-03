import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import { SupabaseAuthRepository } from "../../../data/supabase/SupabaseAuthRepository";
import { isSupabaseConfigured } from "../../../data/supabase/config";
import { useIdentityStore } from "../../../shared/state/identityStore";
import type { Profile } from "../domain/profile";

const PROFILE_CACHE_KEY = "sastreria_cached_profile";

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

const defaultRepo = new SupabaseAuthRepository();

async function loadCachedProfile(): Promise<Profile | null> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

async function cacheProfile(profile: Profile | null): Promise<void> {
  try {
    if (profile) {
      await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(profile));
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
    setIsLoading(true);
    try {
      await repo.signOut();
      setIsAuthenticated(false);
      applyProfile(null);
      await cacheProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [repo, applyProfile]);

  return { isAuthenticated, isLoading, error, profile, signIn, signOut };
}
