import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { EmptyView, ErrorView, LoadingView } from "../../../shared/components";
import { useClientMeasurementHistory } from "../hooks/useClientMeasurementHistory";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "MeasurementHistory"
>;

export default function MeasurementHistoryScreen({ route }: Props) {
  const { measurements, isLoading, error, reload } =
    useClientMeasurementHistory(route.params.clientId);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) {
    return <LoadingView message="Cargando historial..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  if (measurements.length === 0) {
    return <EmptyView message="Este cliente no tiene medidas registradas." />;
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
});
