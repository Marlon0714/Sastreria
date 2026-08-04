import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import type { ScheduleStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { ScheduleDateTimePickerField } from "../components/ScheduleDateTimePickerField";
import {
  formatDateForDisplay,
  shiftDateString,
  todayDateString,
} from "../domain/dateUtils";
import type { Schedule, ScheduleStatus } from "../domain/types";
import { useScheduleDayView } from "../hooks/useScheduleDayView";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleDayView">;

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string }> = {
  pendiente: { bg: "#fef9c3", text: "#854d0e" },
  agendado: { bg: "#dbeafe", text: "#1e40af" },
  en_proceso: { bg: "#fde68a", text: "#92400e" },
  listo_para_entregar: { bg: "#dcfce7", text: "#166534" },
  entregado: { bg: "#e2e8f0", text: "#334155" },
};

export default function ScheduleDayViewScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const { dateSchedules, pendingSchedules, isLoading, error, reload } =
    useScheduleDayView(selectedDate);
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
  }, [clientRepository, dateSchedules, pendingSchedules]);

  const clientLabel = useMemo(
    () => (schedule: Schedule) => {
      const client = clientsById[schedule.clientId];
      return client ? `${client.firstName} ${client.lastName}` : "Cliente";
    },
    [clientsById],
  );

  const renderCard = (item: Schedule, dateLabel: string) => {
    const statusColor = STATUS_COLORS[item.status];
    return (
      <Pressable
        key={item.id}
        accessibilityLabel={`Ver turno de ${clientLabel(item)}`}
        style={styles.card}
        onPress={() =>
          navigation.navigate("ScheduleForm", { scheduleId: item.id })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{dateLabel}</Text>
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
  };

  if (
    isLoading &&
    dateSchedules.length === 0 &&
    pendingSchedules.length === 0
  ) {
    return <LoadingView message="Cargando agenda..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Día anterior"
          style={styles.navButton}
          onPress={() =>
            setSelectedDate((current) => shiftDateString(current, -1))
          }
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <View style={styles.dateSelector}>
          <ScheduleDateTimePickerField
            mode="date"
            value={selectedDate}
            onChange={(value) => {
              if (value) setSelectedDate(value);
            }}
            placeholder="Elegir fecha"
            accessibilityLabel="Elegir fecha"
            allowClear={false}
          />
        </View>

        <Pressable
          accessibilityLabel="Día siguiente"
          style={styles.navButton}
          onPress={() =>
            setSelectedDate((current) => shiftDateString(current, 1))
          }
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {selectedDate !== todayDateString() ? (
        <Pressable
          accessibilityLabel="Ir a hoy"
          style={styles.todayButton}
          onPress={() => setSelectedDate(todayDateString())}
        >
          <Text style={styles.todayButtonText}>Ir a hoy</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.listContent}>
        {pendingSchedules.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pendientes (sin fecha)</Text>
            {pendingSchedules.map((item) => renderCard(item, "Sin fecha"))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {formatDateForDisplay(selectedDate)}
          </Text>
          {dateSchedules.length === 0 ? (
            <Text style={styles.emptyText}>No hay turnos para este día.</Text>
          ) : (
            dateSchedules.map((item) =>
              renderCard(item, item.time ?? "Sin hora"),
            )
          )}
        </View>
      </ScrollView>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonText: {
    fontSize: 22,
    color: "#0f766e",
    fontWeight: "700",
  },
  dateSelector: {
    flex: 1,
  },
  todayButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  todayButtonText: {
    color: "#0f766e",
    fontWeight: "600",
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 20,
    flexGrow: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "capitalize",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontStyle: "italic",
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
