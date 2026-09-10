import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface WeeklyWorkloadBreakdownProps {
  /** Las 7 fechas (lunes a domingo) de la semana mostrada, mismo orden que `counts`. */
  weekDates: string[];
  /** Carga de trabajo (turnos no entregados) por día, mismo orden que `weekDates`. */
  counts: number[];
}

/**
 * Fila de solo lectura con el conteo de carga de trabajo de cada día de la
 * semana. Deliberadamente NO reutiliza `WeekStrip`: ese componente es de
 * navegación (selección + prev/next), y mezclar ahí un dato agregado de
 * solo lectura arriesgaría romper sus otros dos usos (Agenda, Mis
 * Arreglos) — ver Decisión 5 del plan.
 */
export function WeeklyWorkloadBreakdown({
  weekDates,
  counts,
}: WeeklyWorkloadBreakdownProps) {
  return (
    <View style={styles.container}>
      {weekDates.map((date, index) => (
        <View key={date} style={styles.dayCell}>
          <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS[index]}</Text>
          <Text style={styles.countValue}>{counts[index] ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
  },
  dayCell: {
    alignItems: "center",
    minWidth: 32,
    gap: 4,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  countValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
