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
 * Cambios de "Mi cuenta". Contraseña va directo contra Supabase Auth
 * (auth.updateUser solo puede tocar la sesión propia, por diseño). Correo y
 * PIN usan RPCs `set_own_email`/`set_own_pin` (ver SUPABASE_MIGRATIONS.md
 * v38/v34) — a propósito no reciben el id del operario, siempre operan
 * sobre quien está autenticado, así que es imposible pedirle a cualquiera
 * de las dos que cambie el correo/PIN de otra persona. `set_own_email`
 * aplica el cambio de inmediato, sin el correo de confirmación de doble
 * verificación de Supabase Auth (decisión explícita: ver needs-backlog.md).
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
      const { error: rpcError } = await getSupabaseClient().rpc(
        "set_own_email",
        { new_email: newEmail },
      );
      if (rpcError) {
        setError(rpcError.message || "No se pudo cambiar el correo.");
        return false;
      }
      setCurrentEmail(newEmail.trim().toLowerCase());
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
