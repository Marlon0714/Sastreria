import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
  }

  return instance;
}

/** Reset singleton — used in tests only. */
export function _resetSupabaseClient(): void {
  instance = null;
}
