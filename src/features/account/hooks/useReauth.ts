import { useCallback, useState } from "react";

import { getSupabaseClient } from "../../../data/supabase/client";
import { useIdentityStore } from "../../../shared/state/identityStore";

interface ResolveOperarioByPinRow {
  id: string;
  display_name: string;
  role: string;
}

interface UseReauthResult {
  isVerifying: boolean;
  error: string | null;
  /** Confirma la contraseña actual re-autenticando con el correo de la sesión. */
  verifyPassword: (password: string) => Promise<boolean>;
  /** Confirma el PIN actual — solo cuenta si resuelve exactamente a este mismo perfil. */
  verifyPin: (pin: string) => Promise<boolean>;
}

/**
 * Paso de confirmación de identidad antes de cambiar correo/contraseña/PIN
 * en "Mi cuenta". No re-implementa la verificación: reusa lo que Supabase ya
 * ofrece (signInWithPassword) y el RPC de login por PIN que ya existe
 * (resolve_operario_by_pin), solo agregando el chequeo de "¿el que resolvió
 * soy yo mismo?" para el caso del PIN.
 */
export function useReauth(): UseReauthResult {
  const ownProfileId = useIdentityStore(
    (state) => state.ownProfile?.id ?? null,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      setError(null);
      setIsVerifying(true);
      try {
        const supabase = getSupabaseClient();
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData.user?.email) {
          setError("No se pudo confirmar tu identidad. Intenta de nuevo.");
          return false;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword(
          {
            email: userData.user.email,
            password,
          },
        );
        if (signInError) {
          setError("Contraseña incorrecta.");
          return false;
        }

        return true;
      } catch {
        setError("No se pudo confirmar tu identidad. Revisa tu conexión.");
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [],
  );

  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      setError(null);
      setIsVerifying(true);
      try {
        const supabase = getSupabaseClient();
        const { data, error: rpcError } = await supabase.rpc(
          "resolve_operario_by_pin",
          { candidate_pin: pin },
        );
        if (rpcError) {
          setError("No se pudo validar el PIN. Intenta de nuevo.");
          return false;
        }

        const rows = (data ?? []) as ResolveOperarioByPinRow[];
        if (rows.length !== 1 || rows[0]!.id !== ownProfileId) {
          setError("PIN incorrecto.");
          return false;
        }

        return true;
      } catch {
        setError("No se pudo validar el PIN. Revisa tu conexión.");
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [ownProfileId],
  );

  return { isVerifying, error, verifyPassword, verifyPin };
}
