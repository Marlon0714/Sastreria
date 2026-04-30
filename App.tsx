import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  getClientsDependencies,
  getClientsSyncOrchestrator,
} from "./src/data/local/clientsDependencies";
import { getDatabase } from "./src/data/local/database";
import { runMigrations } from "./src/data/local/migrations";
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
    const bootstrap = async (): Promise<void> => {
      try {
        const db = getDatabase();
        await runMigrations(db);
        void getClientsSyncOrchestrator()
          .requestRun()
          .catch((err: unknown) => {
            // TODO: replace with Crashlytics when telemetry is integrated
            console.error(
              JSON.stringify({
                level: "error",
                service: "App",
                message: "Initial sync run failed",
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          });
        setIsReady(true);
      } catch {
        setError("No se pudo inicializar la base de datos local.");
      }
    };

    void bootstrap();
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
