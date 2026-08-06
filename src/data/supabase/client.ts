import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { getSupabaseConfig } from "./config";
import { secureSessionStorage } from "./secureSessionStorage";

let instance: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client.
 * Session is persisted in SecureStore via secureSessionStorage.
 * Call this lazily — it throws if env vars are not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!instance) {
    const { url, publishableKey } = getSupabaseConfig();

    instance = createClient(url, publishableKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // En React Native el refresh automático de supabase-js no sabe cuándo la
    // app está en background — sin este hook (recomendado por la propia
    // documentación de Supabase) el refresh puede no dispararse mientras la
    // app está minimizada, y al volver a abrirla el refresh token ya venció
    // ("Invalid Refresh Token: Refresh Token Not Found"), matando la sesión
    // en silencio. Se registra una sola vez porque `instance` es singleton.
    const client = instance;
    if (AppState.currentState === "active") {
      void client.auth.startAutoRefresh();
    }
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void client.auth.startAutoRefresh();
      } else {
        void client.auth.stopAutoRefresh();
      }
    });
  }

  return instance;
}

/** Reset singleton — used in tests only. */
export function _resetSupabaseClient(): void {
  instance = null;
}
