import { useCallback, useEffect, useState } from "react";

import type { SupabaseAuthRepositoryPort } from "../../../data/supabase/SupabaseAuthRepository";
import { SupabaseAuthRepository } from "../../../data/supabase/SupabaseAuthRepository";
import { isSupabaseConfigured } from "../../../data/supabase/config";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthResult extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultRepo = new SupabaseAuthRepository();

export function useAuth(
  repo: SupabaseAuthRepositoryPort = defaultRepo,
): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    repo
      .hasValidSession()
      .then((valid) => {
        setIsAuthenticated(valid);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repo]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsLoading(true);
      try {
        await repo.signIn(email, password);
        setIsAuthenticated(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error al iniciar sesión.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [repo],
  );

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await repo.signOut();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  return { isAuthenticated, isLoading, error, signIn, signOut };
}
