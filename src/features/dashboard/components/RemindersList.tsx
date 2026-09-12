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

// Copy unificado por número de días, NO por severidad (revertido N-113): el
// usuario pidió el mismo patrón para ambas severidades, decidido por
// `daysWaiting` directamente — menos de 30 días → "sin reclamarlo", 30 o
// más → "guardado". En la práctica hoy coincide con el umbral de severidad
// (15-29 "por_vencer" vs 30+ "vencido"), pero la condición es explícita
// sobre el número de días, no sobre el string de `severity`.
function formatDaysWaiting(daysWaiting: number): string {
  if (daysWaiting < 30) {
    return daysWaiting === 1
      ? "Lleva 1 día sin reclamarlo"
      : `Lleva ${daysWaiting} días sin reclamarlo`;
  }
  return daysWaiting === 1
    ? "Lleva 1 día guardado"
    : `Lleva ${daysWaiting} días guardado`;
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
            accessibilityLabel={`Ver turno de ${item.clientLabel}, ${formatDaysWaiting(item.daysWaiting)}`}
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
              {formatDaysWaiting(item.daysWaiting)}
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
