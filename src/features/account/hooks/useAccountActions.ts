import { useCallback, useEffect, useState } from "react";

import { getSupabaseClient } from "../../../data/supabase/client";

interface UseAccountActionsResult {
  currentEmail: string | null;
  isLoadingEmail: boolean;
  isSubmitting: boolean;
  error: string | null;
  changeEmail: (newEmail: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
  changePin: (newPin: string) => Promise<boolean>;
  /** Limpia el `error` de una acción anterior — útil al cambiar de modo de edición. */
  clearError: () => void;
}

/**
 * Cambios de "Mi cuenta". Correo/contraseña van directo contra Supabase Auth
 * (auth.updateUser solo puede tocar la sesión propia, por diseño). El PIN
 * usa set_own_pin (ver SUPABASE_MIGRATIONS.md v34) — a propósito no recibe
 * el id del operario, siempre opera sobre quien está autenticado, así que
 * es imposible pedirle que cambie el PIN de otra persona.
 */
export function useAccountActions(): UseAccountActionsResult {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setCurrentEmail(data.user?.email ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingEmail(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeEmail = useCallback(async (newEmail: string): Promise<boolean> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser(
        { email: newEmail },
      );
      if (updateError) {
        setError(updateError.message || "No se pudo cambiar el correo.");
        return false;
      }
      return true;
    } catch {
      setError("No se pudo cambiar el correo. Revisa tu conexión.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const changePassword = useCallback(
    async (newPassword: string): Promise<boolean> => {
      setError(null);
      setIsSubmitting(true);
      try {
        const { error: updateError } =
          await getSupabaseClient().auth.updateUser({ password: newPassword });
        if (updateError) {
          setError(updateError.message || "No se pudo cambiar la contraseña.");
          return false;
        }
        return true;
      } catch {
        setError("No se pudo cambiar la contraseña. Revisa tu conexión.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const changePin = useCallback(async (newPin: string): Promise<boolean> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: rpcError } = await getSupabaseClient().rpc(
        "set_own_pin",
        { candidate_pin: newPin },
      );
      if (rpcError) {
        setError(rpcError.message || "No se pudo cambiar el PIN.");
        return false;
      }
      return true;
    } catch {
      setError("No se pudo cambiar el PIN. Revisa tu conexión.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    currentEmail,
    isLoadingEmail,
    isSubmitting,
    error,
    changeEmail,
    changePassword,
    changePin,
    clearError,
  };
}
