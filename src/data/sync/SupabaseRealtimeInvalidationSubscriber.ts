import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseClient } from "../supabase/client";

// "profiles" queda deliberadamente FUERA de esta lista: postgres_changes lee
// directo del WAL y entrega el payload completo de la fila por websocket,
// sin respetar el REVOKE SELECT (pin_hash) de v18_profiles_roles (ese revoke
// solo protege SELECT/REST). Suscribirse a esta tabla filtraría el pin_hash
// hasheado a cualquier cliente autenticado inspeccionando el tráfico de red.
// profiles_cache se sigue refrescando igual vía el pull normal en cada
// bootstrap/foreground/reconexión (SyncLifecycleController/App.tsx), solo
// se pierde el "push" instantáneo mientras la app está abierta.
type InvalidationTable =
  | "clients"
  | "camisa_measurements"
  | "pantalon_measurements"
  | "pricing_services"
  | "saco_measurements"
  | "chaleco_measurements"
  | "talla_templates"
  | "schedules"
  | "schedule_events"
  | "sync_delete_log";

const SYNC_TABLES: readonly InvalidationTable[] = [
  "clients",
  "camisa_measurements",
  "pantalon_measurements",
  "pricing_services",
  "saco_measurements",
  "chaleco_measurements",
  "talla_templates",
  "schedules",
  "schedule_events",
  "sync_delete_log",
];

export interface RealtimeInvalidationSubscriber {
  start(): void;
  stop(): Promise<void>;
}

export class SupabaseRealtimeInvalidationSubscriber implements RealtimeInvalidationSubscriber {
  private channel: RealtimeChannel | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onInvalidation: () => void,
    private readonly debounceMs: number = 400,
  ) {}

  start(): void {
    if (this.channel) {
      return;
    }

    const supabase = getSupabaseClient();
    let channel = supabase.channel("sync-invalidation");

    for (const table of SYNC_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          this.scheduleInvalidation();
        },
      );
    }

    this.channel = channel.subscribe();
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (!this.channel) {
      return;
    }

    const supabase = getSupabaseClient();
    await supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private scheduleInvalidation(): void {
    if (this.debounceTimer) {
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onInvalidation();
    }, this.debounceMs);
  }
}
