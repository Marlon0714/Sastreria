import { AppState, type AppStateStatus } from "react-native";

export interface SyncLifecycleControllerPort {
  start(): void;
  stop(): void;
}

export class SyncLifecycleController implements SyncLifecycleControllerPort {
  private subscription: { remove: () => void } | null = null;
  private currentState: AppStateStatus = AppState.currentState;

  constructor(private readonly onEnterForeground: () => void) {}

  start(): void {
    if (this.subscription) {
      return;
    }

    this.subscription = AppState.addEventListener("change", (nextState) => {
      const wasForeground = this.currentState === "active";
      const isForeground = nextState === "active";

      this.currentState = nextState;

      if (!wasForeground && isForeground) {
        this.onEnterForeground();
      }
    });
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
  }
}
