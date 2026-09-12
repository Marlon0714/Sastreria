import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  DashboardStackParamList,
  RootTabParamList,
} from "../../../navigation/types";
import { formatWeekdayAndMonth } from "../../schedule/domain/dateUtils";
import type { Schedule, ScheduleStatus } from "../../schedule/domain/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { colors } from "../../../shared/theme/colors";
import type { ScheduleListItem } from "../domain/scheduleListBucket";
import { useScheduleListByStatus } from "../hooks/useScheduleListByStatus";

type Props = NativeStackScreenProps<
  DashboardStackParamList,
  "ScheduleListByStatus"
>;

// Duplicado a propósito de `ScheduleDayViewScreen` (Decisión 3 del plan):
// son 5 líneas de mapeo texto/color, no lógica de negocio — forzar una
// extracción compartida ahora acoplaría dos pantallas con ciclos de vida
// distintos por un ahorro cosmético.
const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string }> = {
  pendiente: { bg: "#f1f5f9", text: colors.textMuted },
  agendado: { bg: colors.primarySoft, text: colors.primary },
  en_proceso: { bg: colors.warningSoft, text: colors.warning },
  listo_para_entregar: { bg: colors.successSoft, text: colors.success },
  entregado: { bg: colors.success, text: "#ffffff" },
};

function formatDateTimeLabel(schedule: Schedule): string {
  if (!schedule.date) return "Sin fecha";
  const dateLabel = formatWeekdayAndMonth(schedule.date);
  return schedule.time ? `${dateLabel} · ${schedule.time}` : dateLabel;
}

export default function ScheduleListByStatusScreen({
  navigation,
  route,
}: Props) {
  const { bucket, startDate, endDate } = route.params;
  const { isLoading, error, reload, items } = useScheduleListByStatus(
    bucket,
    startDate,
    endDate,
  );

  // La pantalla puede quedar abierta mientras se resuelve un turno desde
  // `ScheduleForm` (navegación cruzada de tab) y se vuelve acá — mismo
  // patrón que `DashboardScreen`/`ScheduleDayViewScreen`.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Mismo mecanismo cruzado de tab que `handlePressReminder` en
  // `DashboardScreen.tsx`.
  const handlePressItem = (scheduleId: string): void => {
    const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
    parent?.navigate("ScheduleTab", {
      screen: "ScheduleForm",
      params: { scheduleId },
    });
  };

  if (isLoading) {
    return <LoadingView message="Cargando turnos..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {items.length === 0 ? (
        <Text style={styles.emptyText}>No hay turnos en este grupo.</Text>
      ) : (
        items.map((item: ScheduleListItem) => {
          const statusColor = STATUS_COLORS[item.schedule.status];
          return (
            <Pressable
              key={item.schedule.id}
              accessibilityLabel={`Ver turno de ${item.clientLabel}`}
              style={styles.card}
              onPress={() => handlePressItem(item.schedule.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardClient} numberOfLines={1}>
                  {item.clientLabel}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusColor.text }]}
                  >
                    {STATUS_LABELS[item.schedule.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDate}>
                {formatDateTimeLabel(item.schedule)}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16,
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
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
