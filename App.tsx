import "react-native-url-polyfill/auto";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  getClientsDependencies,
  getClientsSyncOrchestrator,
} from "./src/data/local/clientsDependencies";
import { getDatabase } from "./src/data/local/database";
import { runMigrations } from "./src/data/local/migrations";
import { isSupabaseConfigured } from "./src/data/supabase/config";
import { SupabasePullSync } from "./src/data/sync/SupabasePullSync";
import { SupabaseRealtimeInvalidationSubscriber } from "./src/data/sync/SupabaseRealtimeInvalidationSubscriber";
import { SyncLifecycleController } from "./src/data/sync/SyncLifecycleController";
import type { SyncTriggerSource } from "./src/data/sync/types";
import { ClientsDependenciesProvider } from "./src/features/clients/hooks/ClientsDependenciesProvider";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const clientsDependencies = useMemo(
    () => (isReady ? getClientsDependencies() : null),
    [isReady],
  );

  useEffect(() => {
    let isMounted = true;
    let realtimeSubscriber: SupabaseRealtimeInvalidationSubscriber | null =
      null;
    let lifecycleController: SyncLifecycleController | null = null;

    const logSyncError = (message: string, err: unknown): void => {
      console.error(
        JSON.stringify({
          level: "error",
          service: "App",
          message,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    };

    const bootstrap = async (): Promise<void> => {
      try {
        const db = getDatabase();
        await runMigrations(db);

        const syncOrchestrator = getClientsSyncOrchestrator();
        const pullSync = isSupabaseConfigured() ? new SupabasePullSync() : null;

        const triggerSync = (source: SyncTriggerSource): void => {
          void syncOrchestrator.requestRun(source).catch((err: unknown) => {
            logSyncError("Sync run failed", err);
          });

          if (!pullSync) {
            return;
          }

          void pullSync.pullIncremental().catch((err: unknown) => {
            logSyncError("Incremental pull sync failed", err);
          });
        };

        if (pullSync) {
          realtimeSubscriber = new SupabaseRealtimeInvalidationSubscriber(
            () => {
              triggerSync("realtime");
            },
          );
          realtimeSubscriber.start();
        }

        lifecycleController = new SyncLifecycleController(() => {
          triggerSync("foreground");
        });
        lifecycleController.start();

        triggerSync("bootstrap");

        if (isMounted) {
          setIsReady(true);
        }
      } catch {
        if (isMounted) {
          setError("No se pudo inicializar la base de datos local.");
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
      lifecycleController?.stop();
      void realtimeSubscriber?.stop();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady || !clientsDependencies) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Preparando aplicación...</Text>
      </View>
    );
  }

  return (
    <ClientsDependenciesProvider dependencies={clientsDependencies}>
      <RootNavigator />
    </ClientsDependenciesProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  message: {
    color: "#334155",
    fontSize: 16,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 16,
    textAlign: "center",
  },
});
