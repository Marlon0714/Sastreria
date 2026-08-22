import type { Session } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import type { Profile } from "../../features/auth/domain/profile";
import { getSupabaseClient } from "./client";

export interface AuthSession {
  userId: string;
  accessToken: string;
}

/**
 * Se lanza desde `getSession()` (y por lo tanto desde `hasValidSession()`)
 * cuando Supabase intentó refrescar el access token expirado y el intento
 * falló por un problema de RED/reintentable — no porque el refresh token
 * haya sido invalidado de verdad. Sin esta distinción, un dispositivo sin
 * conexión en el momento exacto en que el token de 1h expira vería su
 * sesión tratada como inexistente y sería mandado al login, algo que
 * contradice el propósito offline-first de la app. Quien llame a
 * `getSession()`/`hasValidSession()` debe capturar este error por separado
 * y NO tratarlo como "no hay sesión".
 */
export class AuthNetworkError extends Error {
  constructor(message = "[auth] Network error while checking session.") {
    super(message);
    this.name = "AuthNetworkError";
  }
}

export interface SupabaseAuthRepositoryPort {
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  /**
   * Puede lanzar {@link AuthNetworkError} cuando el refresh del token
   * expirado falla por conectividad — en ese caso NO significa que la
   * sesión no exista, significa que no se pudo confirmar. Quien llama debe
   * distinguir ese caso de un `null` real.
   */
  getSession(): Promise<AuthSession | null>;
  /** Puede lanzar {@link AuthNetworkError}; ver `getSession()`. */
  hasValidSession(): Promise<boolean>;
  getProfile(userId: string): Promise<Profile | null>;
  /**
   * Se dispara con `hasSession=false` cuando Supabase determina que la
   * sesión ya no es válida (ej. refresh token muerto) — incluso si nadie
   * llamó a `signOut()` explícitamente. Retorna una función para cancelar
   * la suscripción.
   */
  onAuthStateChange(callback: (hasSession: boolean) => void): () => void;
}

function toAuthSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    accessToken: session.access_token,
  };
}

export class SupabaseAuthRepository implements SupabaseAuthRepositoryPort {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      if (error && isAuthRetryableFetchError(error)) {
        throw new Error(
          "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
        );
      }
      // Sanitized error: do not expose email/password in message
      throw new Error("[auth] Sign in failed. Check credentials and try again.");
    }

    return toAuthSession(data.session);
  }

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error("[auth] Sign out failed.");
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      if (isAuthRetryableFetchError(error)) {
        // El access token expiró y supabase-js intentó refrescarlo por red;
        // el intento falló por conectividad, no porque el refresh token
        // haya sido invalidado. No sabemos si la sesión sigue siendo
        // válida, así que NO la tratamos como inexistente.
        throw new AuthNetworkError();
      }
      return null;
    }

    if (!data.session) {
      return null;
    }

    return toAuthSession(data.session);
  }

  async hasValidSession(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  onAuthStateChange(callback: (hasSession: boolean) => void): () => void {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session !== null);
    });

    return () => subscription.unsubscribe();
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, is_shared_device")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      displayName: data.display_name,
      role: data.role,
      isSharedDevice: data.is_shared_device,
    };
  }
}
