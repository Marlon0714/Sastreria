interface NetworkStatusAdapter {
  subscribe(onNetworkStatusChange: (isOnline: boolean) => void): () => void;
  getCurrentStatus: () => Promise<boolean>;
}

interface SyncConnectivityControllerOptions {
  cooldownMs?: number;
  adapter?: NetworkStatusAdapter;
  now?: () => number;
  onConnectivityChange?: (isOnline: boolean) => void;
}

const DEFAULT_COOLDOWN_MS = 7000;

function resolveOnlineFromState(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  if (typeof state.isInternetReachable === "boolean") {
    return state.isInternetReachable;
  }

  return Boolean(state.isConnected);
}

function createDefaultAdapter(): NetworkStatusAdapter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const netInfoModule = require("@react-native-community/netinfo") as {
      addEventListener: (
        listener: (state: {
          isConnected: boolean | null;
          isInternetReachable?: boolean | null;
        }) => void,
      ) => () => void;
      fetch: () => Promise<{
        isConnected: boolean | null;
        isInternetReachable?: boolean | null;
      }>;
    };

    return {
      subscribe: (onNetworkStatusChange) =>
        netInfoModule.addEventListener((state) => {
          onNetworkStatusChange(resolveOnlineFromState(state));
        }),
      getCurrentStatus: async () => {
        const state = await netInfoModule.fetch();
        return resolveOnlineFromState(state);
      },
    };
  } catch {
    return null;
  }
}

export class SyncConnectivityController {
  private unsubscribe: (() => void) | null = null;
  private lastKnownOnline: boolean | null = null;
  private lastRecoveryAt = 0;
  private readonly cooldownMs: number;
  private readonly adapter: NetworkStatusAdapter | null;
  private readonly now: () => number;
  private readonly onConnectivityChange?: (isOnline: boolean) => void;

  constructor(
    private readonly onNetworkRecovered: () => void,
    options: SyncConnectivityControllerOptions = {},
  ) {
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.adapter = options.adapter ?? createDefaultAdapter();
    this.now = options.now ?? (() => Date.now());
    this.onConnectivityChange = options.onConnectivityChange;
  }

  async start(): Promise<void> {
    if (!this.adapter || this.unsubscribe) {
      return;
    }

    this.lastKnownOnline = await this.adapter.getCurrentStatus();
    this.onConnectivityChange?.(this.lastKnownOnline);

    this.unsubscribe = this.adapter.subscribe((isOnline) => {
      const wasOnline = this.lastKnownOnline;
      this.lastKnownOnline = isOnline;
      this.onConnectivityChange?.(isOnline);

      if (wasOnline === false && isOnline) {
        this.emitRecoveryIfAllowed();
      }
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private emitRecoveryIfAllowed(): void {
    const now = this.now();

    if (this.lastRecoveryAt > 0 && now - this.lastRecoveryAt < this.cooldownMs) {
      return;
    }

    this.lastRecoveryAt = now;
    this.onNetworkRecovered();
  }
}
