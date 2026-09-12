import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";
import type { ReminderItem } from "../domain/overdueSchedules";

interface RemindersListProps {
  /** Ya vienen ordenados por urgencia (ver buildReminderItems) — no se reordenan acá. */
  items: ReminderItem[];
  onPressItem: (scheduleId: string) => void;
}

const SEVERITY_LABELS: Record<ReminderItem["severity"], string> = {
  vencido: "Vencido",
  por_vencer: "Por vencer",
};

const SEVERITY_COLORS: Record<
  ReminderItem["severity"],
  { bg: string; text: string }
> = {
  vencido: { bg: colors.dangerSoft, text: colors.danger },
  por_vencer: { bg: colors.warningSoft, text: colors.warning },
};

// Texto distinto según severidad (N-113): "vencido" ya superó el umbral de
// espera, así que "guardado" comunica mejor que es el arreglo el que lleva
// tiempo ahí sin que lo recojan. "por_vencer" todavía no cruzó ese umbral —
// "esperando" (a ser recogido) sigue teniendo más sentido ahí que
// "guardado", que sugeriría más urgencia de la que aplica todavía.
function formatDaysWaiting(
  daysWaiting: number,
  severity: ReminderItem["severity"],
): string {
  if (severity === "vencido") {
    return daysWaiting === 1
      ? "Lleva 1 día guardado"
      : `Lleva ${daysWaiting} días guardado`;
  }
  return daysWaiting === 1
    ? "1 día esperando"
    : `${daysWaiting} días esperando`;
}

/** Lista de turnos "listo para entregar" que llevan tiempo sin recogerse. */
export function RemindersList({ items, onPressItem }: RemindersListProps) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay turnos por recoger.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const severityColor = SEVERITY_COLORS[item.severity];
        return (
          <Pressable
            key={item.schedule.id}
            accessibilityLabel={`Ver turno de ${item.clientLabel}, ${formatDaysWaiting(item.daysWaiting, item.severity)}`}
            style={styles.card}
            onPress={() => onPressItem(item.schedule.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.clientLabel} numberOfLines={1}>
                {item.clientLabel}
              </Text>
              <View
                style={[styles.badge, { backgroundColor: severityColor.bg }]}
              >
                <Text style={[styles.badgeText, { color: severityColor.text }]}>
                  {SEVERITY_LABELS[item.severity]}
                </Text>
              </View>
            </View>
            <Text style={styles.daysWaiting}>
              {formatDaysWaiting(item.daysWaiting, item.severity)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  emptyContainer: {
    paddingVertical: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
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
  clientLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  daysWaiting: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
