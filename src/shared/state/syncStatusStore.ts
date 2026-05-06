import { create } from "zustand";

import type {
  SyncBannerVariant,
  SyncConnectivity,
  SyncMode,
} from "../../data/sync/types";

interface SyncStatusState {
  mode: SyncMode;
  connectivity: SyncConnectivity;
  hasPending: boolean;
  lastSyncAttempt: string | null;
  lastSyncError: string | null;
  bannerVariant: SyncBannerVariant;
  setMode: (mode: SyncMode) => void;
  setConnectivity: (connectivity: SyncConnectivity) => void;
  setHasPending: (hasPending: boolean) => void;
  setLastSyncAttempt: (lastSyncAttempt: string) => void;
  setLastSyncError: (lastSyncError: string | null) => void;
  refreshBannerVariant: () => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  mode: "cloud" as SyncMode,
  connectivity: "unknown" as SyncConnectivity,
  hasPending: false,
  lastSyncAttempt: null,
  lastSyncError: null,
  bannerVariant: "none" as SyncBannerVariant,
};

function deriveBannerVariant(
  mode: SyncMode,
  connectivity: SyncConnectivity,
  hasPending: boolean,
): SyncBannerVariant {
  if (mode === "local-only") {
    return "local_only";
  }

  if (connectivity === "offline" && hasPending) {
    return "offline";
  }

  if (hasPending) {
    return "syncing_pending";
  }

  return "none";
}

export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  ...DEFAULT_STATE,
  setMode: (mode): void => {
    set((state) => ({
      mode,
      bannerVariant: deriveBannerVariant(
        mode,
        state.connectivity,
        state.hasPending,
      ),
    }));
  },
  setConnectivity: (connectivity): void => {
    set((state) => ({
      connectivity,
      bannerVariant: deriveBannerVariant(
        state.mode,
        connectivity,
        state.hasPending,
      ),
    }));
  },
  setHasPending: (hasPending): void => {
    set((state) => ({
      hasPending,
      bannerVariant: deriveBannerVariant(
        state.mode,
        state.connectivity,
        hasPending,
      ),
    }));
  },
  setLastSyncAttempt: (lastSyncAttempt): void => {
    set({ lastSyncAttempt });
  },
  setLastSyncError: (lastSyncError) => {
    set({ lastSyncError });
  },
  refreshBannerVariant: (): void => {
    const state = get();
    set({
      bannerVariant: deriveBannerVariant(
        state.mode,
        state.connectivity,
        state.hasPending,
      ),
    });
  },
  reset: (): void => {
    set(DEFAULT_STATE);
  },
}));
