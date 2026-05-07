import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { EmptyView, ErrorView, LoadingView } from "../../../shared/components";
import { useClientList } from "../hooks/useClientList";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientList">;
type ClientFilter = "all" | "name" | "phone";

function renderSyncBadge(syncStatus: "pending" | "synced" | "error") {
  if (syncStatus === "synced") {
    return null;
  }

  const isError = syncStatus === "error";
  return (
    <View
      accessibilityLabel={
        isError
          ? "Badge sincronizacion con error"
          : "Badge pendiente de sincronizacion"
      }
      style={[
        styles.syncBadge,
        isError ? styles.syncBadgeError : styles.syncBadgePending,
      ]}
    >
      <Text
        style={[
          styles.syncBadgeText,
          isError ? styles.syncBadgeTextError : styles.syncBadgeTextPending,
        ]}
      >
        {isError ? "Error sync" : "Pendiente sync"}
      </Text>
    </View>
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export default function ClientListScreen({ navigation }: Props) {
  const { clients, isLoading, error, reload } = useClientList();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<ClientFilter>("all");

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    if (!normalizedQuery) {
      return clients;
    }

    const numericQuery = normalizePhone(searchTerm);

    return clients.filter((client) => {
      const normalizedName = normalizeText(
        `${client.firstName} ${client.lastName}`,
      );
      const normalizedClientPhone = normalizePhone(client.phone);

      if (filterBy === "name") {
        return normalizedName.includes(normalizedQuery);
      }

      if (filterBy === "phone") {
        return numericQuery
          ? normalizedClientPhone.includes(numericQuery)
          : false;
      }

      return (
        normalizedName.includes(normalizedQuery) ||
        (numericQuery ? normalizedClientPhone.includes(numericQuery) : false)
      );
    });
  }, [clients, filterBy, searchTerm]);

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

  const searchActive = normalizeText(searchTerm).length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <TextInput
          accessibilityLabel="Buscar cliente por nombre o telefono"
          placeholder="Buscar por nombre o telefono"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
        />
        <View style={styles.filterRow}>
          <Pressable
            accessibilityLabel="Filtro todos"
            style={[
              styles.filterButton,
              filterBy === "all" ? styles.filterButtonActive : null,
            ]}
            onPress={() => setFilterBy("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterBy === "all" ? styles.filterButtonTextActive : null,
              ]}
            >
              Todos
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Filtro nombre"
            style={[
              styles.filterButton,
              filterBy === "name" ? styles.filterButtonActive : null,
            ]}
            onPress={() => setFilterBy("name")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterBy === "name" ? styles.filterButtonTextActive : null,
              ]}
            >
              Nombre
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Filtro telefono"
            style={[
              styles.filterButton,
              filterBy === "phone" ? styles.filterButtonActive : null,
            ]}
            onPress={() => setFilterBy("phone")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterBy === "phone" ? styles.filterButtonTextActive : null,
              ]}
            >
              Telefono
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          searchActive ? (
            <Text style={styles.noResultsText}>
              No hay clientes que coincidan con la busqueda.
            </Text>
          ) : null
        }
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
            {renderSyncBadge(item.syncStatus)}
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
    flexGrow: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  filterButtonActive: {
    borderColor: "#0f766e",
    backgroundColor: "#ccfbf1",
  },
  filterButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: "#115e59",
  },
  noResultsText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    marginTop: 32,
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
  syncBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  syncBadgePending: {
    backgroundColor: "#ecfeff",
    borderColor: "#67e8f9",
  },
  syncBadgeError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  syncBadgeTextPending: {
    color: "#0e7490",
  },
  syncBadgeTextError: {
    color: "#b91c1c",
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
