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
import { useClientMeasurementHistory } from "../hooks/useClientMeasurementHistory";

type Props = NativeStackScreenProps<RootStackParamList, "MeasurementHistory">;

export default function MeasurementHistoryScreen({ route }: Props) {
  const { measurements, isLoading, error, reload } =
    useClientMeasurementHistory(route.params.clientId);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Cargando historial...</Text>
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

  if (measurements.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Este cliente no tiene medidas registradas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={measurements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {new Date(item.measuredAt).toLocaleString()}
            </Text>
            <Text style={styles.measureText}>Pecho: {item.pechoCm} cm</Text>
            <Text style={styles.measureText}>Cintura: {item.cinturaCm} cm</Text>
            <Text style={styles.measureText}>Cadera: {item.caderaCm} cm</Text>
            <Text style={styles.measureText}>Largo: {item.largoCm} cm</Text>
            <Text style={styles.syncText}>syncStatus: {item.syncStatus}</Text>
            {item.notes ? (
              <Text style={styles.noteText}>Notas: {item.notes}</Text>
            ) : null}
          </View>
        )}
      />
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
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  measureText: {
    fontSize: 14,
    color: "#334155",
  },
  syncText: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
  },
  noteText: {
    marginTop: 4,
    fontSize: 13,
    color: "#334155",
  },
  secondaryButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
});
