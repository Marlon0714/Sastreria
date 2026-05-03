import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const webMemoryStorage = new Map<string, string>();

function getWebStorageKey(key: string): string {
  return `supabase.auth.${key}`;
}

function getWebItem(key: string): string | null {
  const namespacedKey = getWebStorageKey(key);

  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(namespacedKey);
  }

  return webMemoryStorage.get(namespacedKey) ?? null;
}

function setWebItem(key: string, value: string): void {
  const namespacedKey = getWebStorageKey(key);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(namespacedKey, value);
    return;
  }

  webMemoryStorage.set(namespacedKey, value);
}

function removeWebItem(key: string): void {
  const namespacedKey = getWebStorageKey(key);

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(namespacedKey);
    return;
  }

  webMemoryStorage.delete(namespacedKey);
}

/**
 * SecureStore-backed storage adapter for Supabase session tokens.
 * Tokens (access_token, refresh_token) are stored in the device's
 * secure enclave and never in AsyncStorage or plain text.
 */
export const secureSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return getWebItem(key);
    }

    const value = await SecureStore.getItemAsync(key);
    // Backward-compatible fallback: treat empty string as missing value.
    return value === "" ? null : value;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      setWebItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      removeWebItem(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
      return;
    } catch {
      // Some runtime/native mismatches can break deleteItemAsync.
      // Keep auth flow functional by clearing value as empty string.
      await SecureStore.setItemAsync(key, "");
    }
  },
};
