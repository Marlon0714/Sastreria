import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getDatabase } from "./src/data/local/database";
import { runMigrations } from "./src/data/local/migrations";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      try {
        const db = getDatabase();
        await runMigrations(db);
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

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Preparando aplicación...</Text>
      </View>
    );
  }

  return <RootNavigator />;
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
