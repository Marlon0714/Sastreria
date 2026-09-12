import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";
import { formatDateForDisplay } from "../../schedule/domain/dateUtils";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface WeeklyWorkloadBreakdownProps {
  /** Las 7 fechas (lunes a domingo) de la semana mostrada, mismo orden que `counts`. */
  weekDates: string[];
  /** Carga de trabajo (turnos no entregados) por día, mismo orden que `weekDates`. */
  counts: number[];
  /** N-111: navega a la Agenda de ese día al tocar su columna. */
  onPressDay: (date: string) => void;
}

/**
 * Fila con el conteo de carga de trabajo de cada día de la semana — cada
 * columna es tocable y navega a la Agenda de ese día (N-111). Deliberadamente
 * NO reutiliza `WeekStrip`: ese componente es de navegación (selección +
 * prev/next) dentro de la propia Agenda, y mezclar ahí este dato agregado
 * arriesgaría romper sus otros dos usos (Agenda, Mis Arreglos) — ver
 * Decisión 5 del plan original.
 */
export function WeeklyWorkloadBreakdown({
  weekDates,
  counts,
  onPressDay,
}: WeeklyWorkloadBreakdownProps) {
  return (
    <View style={styles.container}>
      {weekDates.map((date, index) => (
        <Pressable
          key={date}
          accessibilityLabel={`Ver agenda del ${formatDateForDisplay(date)}`}
          style={styles.dayCell}
          onPress={() => onPressDay(date)}
        >
          <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS[index]}</Text>
          <Text style={styles.countValue}>{counts[index] ?? 0}</Text>
        </Pressable>
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
