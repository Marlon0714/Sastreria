import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const DEBUG_MODE_STORAGE_KEY = "sastreria_debug_mode_unlocked";

type DebugModeStore = {
  debugModeUnlocked: boolean;
  hydrate: () => Promise<void>;
  unlock: () => Promise<void>;
};

/**
 * Habilita el visor de logs (herramienta de depuración) solo en el
 * dispositivo donde se desbloqueó explícitamente. Por defecto (cualquier
 * instalación nueva) está apagado y no expone ningún botón ni gesto visible.
 */
export const useDebugModeStore = create<DebugModeStore>((set) => ({
  debugModeUnlocked: false,
  hydrate: async () => {
    const value = await SecureStore.getItemAsync(DEBUG_MODE_STORAGE_KEY);
    if (value === "true") {
      set({ debugModeUnlocked: true });
    }
  },
  unlock: async () => {
    await SecureStore.setItemAsync(DEBUG_MODE_STORAGE_KEY, "true");
    set({ debugModeUnlocked: true });
  },
}));
