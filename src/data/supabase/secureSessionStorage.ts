import * as SecureStore from "expo-secure-store";

/**
 * SecureStore-backed storage adapter for Supabase session tokens.
 * Tokens (access_token, refresh_token) are stored in the device's
 * secure enclave and never in AsyncStorage or plain text.
 */
export const secureSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};
