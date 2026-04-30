import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { EmptyView, ErrorView, LoadingView } from "../../../shared/components";
import { useClientList } from "../hooks/useClientList";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientList">;

export default function ClientListScreen({ navigation }: Props) {
  const { clients, isLoading, error, reload } = useClientList();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) {
    return <LoadingView message="Cargando clientes..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  if (clients.length === 0) {
    return (
      <EmptyView
        message="No hay clientes registrados."
        actionLabel="Crear nuevo cliente"
        onAction={() => navigation.navigate("ClientCreate")}
      />
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
