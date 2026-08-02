import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import type { ScheduleStackParamList } from "../../../navigation/types";
import { EmptyView, ErrorView, LoadingView } from "../../../shared/components";
import { useScheduleList } from "../hooks/useScheduleList";
import type { Schedule, ScheduleStatus } from "../domain/types";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleList">;

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string }> = {
  pending: { bg: "#fef9c3", text: "#854d0e" },
  confirmed: { bg: "#dbeafe", text: "#1e40af" },
  completed: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

export default function ScheduleListScreen({ navigation }: Props) {
  const { schedules, isLoading, error, reload } = useScheduleList();
  const clientRepository = useClientRepository();
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    let cancelled = false;
    clientRepository.findAll().then((clients) => {
      if (cancelled) return;
      const map: Record<string, Client> = {};
      for (const client of clients) {
        map[client.id] = client;
      }
      setClientsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [clientRepository, schedules]);

  const clientLabel = useMemo(
    () => (schedule: Schedule) => {
      const client = clientsById[schedule.clientId];
      return client ? `${client.firstName} ${client.lastName}` : "Cliente";
    },
    [clientsById],
  );

  if (isLoading && schedules.length === 0) {
    return <LoadingView message="Cargando agenda..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  if (schedules.length === 0) {
    return (
      <EmptyView
        message="No hay turnos registrados."
        actionLabel="Nuevo turno"
        onAction={() => navigation.navigate("ScheduleForm", {})}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status];
          return (
            <Pressable
              accessibilityLabel={`Ver turno de ${clientLabel(item)} el ${item.date}`}
              style={styles.card}
              onPress={() =>
                navigation.navigate("ScheduleForm", { scheduleId: item.id })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>
                  {item.date} · {item.time}
                </Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
                >
                  <Text style={[styles.statusText, { color: statusColor.text }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardClient}>{clientLabel(item)}</Text>
              {item.notes ? (
                <Text style={styles.cardNotes}>{item.notes}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
      <Pressable
        accessibilityLabel="Nuevo turno"
        style={styles.fabButton}
        onPress={() => navigation.navigate("ScheduleForm", {})}
      >
        <Text style={styles.fabButtonText}>Nuevo turno</Text>
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardClient: {
    fontSize: 16,
    color: "#334155",
  },
  cardNotes: {
    fontSize: 13,
    color: "#64748b",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
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
