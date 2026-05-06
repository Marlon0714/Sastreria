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
        <Text style={styles.phone}>{client.phone}</Text>
        {client.notes ? (
          <Text style={styles.notes}>Notas: {client.notes}</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Ver medidas del cliente"
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate("MeasurementTypeSelect", {
            clientId: client.id,
            mode: "create",
          })
        }
      >
        <Text style={styles.primaryButtonText}>Medidas</Text>
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
  phone: {
    fontSize: 15,
    color: "#334155",
  },
  notes: {
    fontSize: 14,
    color: "#334155",
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
});
