import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
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
import { colors } from "../../../shared/theme/colors";
import { useScheduleDayView } from "../hooks/useScheduleDayView";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleDayView">;

type ActiveView = "dia" | "pendientes";

const VIEWS: { key: ActiveView; icon: string; label: string }[] = [
  { key: "dia", icon: "📅", label: "Día" },
  { key: "pendientes", icon: "📋", label: "Pendientes" },
];

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

// Progresión visual del flujo: neutral -> azul (agendado) -> ámbar (en
// proceso) -> verde claro (listo) -> verde sólido (entregado, el final).
const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string }> = {
  pendiente: { bg: "#f1f5f9", text: colors.textMuted },
  agendado: { bg: colors.primarySoft, text: colors.primary },
  en_proceso: { bg: colors.warningSoft, text: colors.warning },
  listo_para_entregar: { bg: colors.successSoft, text: colors.success },
  entregado: { bg: colors.success, text: "#ffffff" },
};

export default function ScheduleDayViewScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [activeView, setActiveView] = useState<ActiveView>("dia");
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
        accessibilityLabel={`Ver turno de ${clientLabel(item)} (${dateLabel}, ${item.id})`}
        style={styles.card}
        onPress={() =>
          navigation.navigate("ScheduleForm", { scheduleId: item.id })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardClient} numberOfLines={1}>
            {clientLabel(item)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
          >
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <View style={styles.cardSubRow}>
          <Text style={styles.cardDate}>{dateLabel}</Text>
          {item.isPriority ? (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>⭐ Prioritario</Text>
            </View>
          ) : null}
        </View>
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
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmented}>
          {VIEWS.map((view) => {
            const isActive = view.key === activeView;
            return (
              <Pressable
                key={view.key}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => setActiveView(view.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {view.icon} {view.label}
                </Text>
                {view.key === "pendientes" && pendingSchedules.length > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      isActive ? styles.badgeActive : styles.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isActive && styles.badgeTextActive,
                      ]}
                    >
                      {pendingSchedules.length}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeView === "dia" ? (
        <>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Día anterior"
              style={styles.navButton}
              onPress={() =>
                setSelectedDate((current) => shiftDateString(current, -1))
              }
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>

            <View style={styles.dateSelector}>
              <ScheduleDateTimePickerField
                mode="date"
                variant="dayNavigator"
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
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
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
        </>
      ) : null}

      <ScrollView contentContainerStyle={styles.listContent}>
        {activeView === "dia" ? (
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
        ) : (
          <View style={styles.section}>
            {pendingSchedules.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay turnos pendientes sin fecha.
              </Text>
            ) : (
              pendingSchedules.map((item) => renderCard(item, "Sin fecha"))
            )}
          </View>
        )}
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
    backgroundColor: colors.background,
  },
  segmentedWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: colors.primarySoft,
  },
  badgeInactive: {
    backgroundColor: colors.borderStrong,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  dateSelector: {
    flex: 1,
  },
  todayButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  todayButtonText: {
    color: colors.primary,
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
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardClient: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  cardNotes: {
    fontSize: 13,
    color: colors.textMuted,
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
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.dangerSoft,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.danger,
  },
  fabButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fabButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
