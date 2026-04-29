import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { RootStackParamList } from "../../../navigation/types";
import { useClientList } from "../hooks/useClientList";

type Props = NativeStackScreenProps<RootStackParamList, "ClientList">;

export default function ClientListScreen({ navigation }: Props) {
  const { clients, isLoading, error, reload } = useClientList();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Cargando clientes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void reload()}>
          <Text style={styles.secondaryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (clients.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No hay clientes registrados.</Text>
        <Pressable
          accessibilityLabel="Crear nuevo cliente"
          style={styles.primaryButton}
          onPress={() => navigation.navigate("ClientCreate")}
        >
          <Text style={styles.primaryButtonText}>Nuevo cliente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Ver detalle de ${item.firstName} ${item.lastName}`}
            style={styles.card}
            onPress={() =>
              navigation.navigate("ClientDetail", { clientId: item.id })
            }
          >
            <Text style={styles.cardTitle}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.cardSubtitle}>{item.phone}</Text>
            <Text style={styles.syncText}>syncStatus: {item.syncStatus}</Text>
          </Pressable>
        )}
      />
      <Pressable
        accessibilityLabel="Crear nuevo cliente"
        style={styles.fabButton}
        onPress={() => navigation.navigate("ClientCreate")}
      >
        <Text style={styles.fabButtonText}>Nuevo cliente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#f8fafc",
  },
  message: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#b91c1c",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#334155",
  },
  syncText: {
    fontSize: 12,
    color: "#64748b",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
  fabButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#0f766e",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fabButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
