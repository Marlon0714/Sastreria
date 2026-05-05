import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseClient } from "../supabase/client";

type InvalidationTable =
  | "clients"
  | "camisa_measurements"
  | "pantalon_measurements"
  | "sync_delete_log";

const SYNC_TABLES: readonly InvalidationTable[] = [
  "clients",
  "camisa_measurements",
  "pantalon_measurements",
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
