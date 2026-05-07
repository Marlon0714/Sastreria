export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * Reads Supabase configuration from EXPO_PUBLIC_* environment variables.
 * Throws a clear error (without exposing values) if variables are missing.
 * Variables must be set in .env before running the app.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || url === "https://your-project-id.supabase.co") {
    throw new Error(
      "[config] EXPO_PUBLIC_SUPABASE_URL is not configured. " +
        "Local: set it in .env. " +
        "Mobile build: set it in eas.json env or via EAS Environment Variables.",
    );
  }

  if (!publishableKey || publishableKey === "your-publishable-key-here") {
    throw new Error(
      "[config] EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured. " +
        "Local: set it in .env. " +
        "Mobile build: set it in eas.json env or via EAS Environment Variables.",
    );
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
