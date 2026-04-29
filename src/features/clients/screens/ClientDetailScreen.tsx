import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ClientRepositoryImpl } from "../../../data/local/ClientRepositoryImpl";
import type { RootStackParamList } from "../../../navigation/types";
import type { Client } from "../domain/types";

type Props = NativeStackScreenProps<RootStackParamList, "ClientDetail">;

const clientRepository = new ClientRepositoryImpl();

export default function ClientDetailScreen({ navigation, route }: Props) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadClient = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const currentClient = await clientRepository.findById(
        route.params.clientId,
      );
      if (!currentClient) {
        setError("El cliente no existe o fue eliminado.");
        setClient(null);
        return;
      }

      setClient(currentClient);
    } catch {
      setError("No se pudo cargar el detalle del cliente.");
    } finally {
      setIsLoading(false);
    }
  }, [route.params.clientId]);

  useFocusEffect(
    useCallback(() => {
      void loadClient();
    }, [loadClient]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Cargando detalle...</Text>
      </View>
    );
  }

  if (error || !client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ?? "No se encontró el cliente."}
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => void loadClient()}
        >
          <Text style={styles.secondaryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {client.firstName} {client.lastName}
        </Text>
        <Text style={styles.phone}>{client.phone}</Text>
        <Text style={styles.syncText}>syncStatus: {client.syncStatus}</Text>
        {client.notes ? (
          <Text style={styles.notes}>Notas: {client.notes}</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Crear nueva medida"
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate("MeasurementCreate", { clientId: client.id })
        }
      >
        <Text style={styles.primaryButtonText}>Nueva medida</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Ver historial de medidas"
        style={styles.secondaryButtonBlock}
        onPress={() =>
          navigation.navigate("MeasurementHistory", { clientId: client.id })
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
  },
  errorText: {
    fontSize: 16,
    color: "#b91c1c",
    textAlign: "center",
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
  syncText: {
    fontSize: 13,
    color: "#64748b",
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
  secondaryButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
