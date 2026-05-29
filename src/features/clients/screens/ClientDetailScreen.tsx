import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { useClientDetail } from "../hooks/useClientDetail";
import { useDeleteClient } from "../hooks/useDeleteClient";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientDetail">;

export default function ClientDetailScreen({ navigation, route }: Props) {
  const { client, isLoading, error, reload } = useClientDetail(
    route.params.clientId,
  );
  const { deleteClient, isDeleting, error: deleteError } = useDeleteClient();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const handleDelete = useCallback(async () => {
    if (!client || isDeleting) return;
    const success = await deleteClient(client.id);
    if (success) {
      navigation.popToTop();
    }
  }, [client, deleteClient, isDeleting, navigation]);

  const confirmDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }

    Alert.alert(
      "Eliminar cliente",
      "¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void handleDelete(),
        },
      ],
    );
  }, [handleDelete, isDeleting]);

  if (isLoading) {
    return <LoadingView message="Cargando detalle..." />;
  }

  if (error || !client) {
    return (
      <ErrorView
        message={error ?? "No se encontró el cliente."}
        onRetry={() => void reload()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {client.firstName} {client.lastName}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📱 Teléfono</Text>
          <Text style={styles.infoValue}>{client.phone}</Text>
        </View>
        {client.phones?.map((phone, idx) => (
          <View key={idx} style={styles.infoRow}>
            <Text style={styles.infoLabel}>📱 Tel. {idx + 2}</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>
        ))}
        {client.cedula ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🪪 Cédula</Text>
            <Text style={styles.infoValue}>{client.cedula}</Text>
          </View>
        ) : null}
        {client.notes ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📋 Notas</Text>
            <Text style={styles.infoValue}>{client.notes}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Ver y registrar medidas del cliente"
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate("MeasurementTypeSelect", {
            clientId: client.id,
            mode: "create",
          })
        }
      >
        <Text style={styles.primaryButtonText}>Ver / Registrar medidas</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Editar datos del cliente"
        style={styles.secondaryButtonBlock}
        onPress={() =>
          navigation.navigate("ClientEdit", { clientId: client.id })
        }
      >
        <Text style={styles.secondaryButtonText}>Editar datos</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Eliminar cliente"
        disabled={isDeleting}
        style={[
          styles.deleteButton,
          isDeleting ? styles.deleteButtonDisabled : null,
        ]}
        onPress={confirmDelete}
      >
        <Text style={styles.deleteButtonText}>
          {isDeleting ? "Eliminando..." : "Eliminar"}
        </Text>
      </Pressable>

      {deleteError ? (
        <Text style={styles.deleteErrorText}>{deleteError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    minWidth: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButtonBlock: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
  deleteButton: {
    borderColor: "#b91c1c",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteErrorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  tallasCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tallasTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  tallasChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tallaChip: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tallaChipText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "600",
  },
  tallasEmpty: {
    fontSize: 13,
    color: "#94a3b8",
  },
  tallasButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  tallasButtonText: {
    color: "#0f766e",
    fontWeight: "600",
    fontSize: 14,
  },
});
