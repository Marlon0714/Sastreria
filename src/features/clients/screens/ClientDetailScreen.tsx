import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { useClientDetail } from "../hooks/useClientDetail";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientDetail">;

export default function ClientDetailScreen({ navigation, route }: Props) {
  const { client, isLoading, error, reload } = useClientDetail(
    route.params.clientId,
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

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
        accessibilityLabel="Crear nueva medida"
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate("MeasurementTypeSelect", {
            clientId: client.id,
            mode: "create",
          })
        }
      >
        <Text style={styles.primaryButtonText}>Nueva medida</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Ver historial de medidas"
        style={styles.secondaryButtonBlock}
        onPress={() =>
          navigation.navigate("MeasurementTypeSelect", {
            clientId: client.id,
            mode: "view",
          })
        }
      >
        <Text style={styles.secondaryButtonText}>Ver historial</Text>
      </Pressable>
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
});
