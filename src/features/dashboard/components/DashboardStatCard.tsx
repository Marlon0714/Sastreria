import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  /** Tono opcional del valor (ej. saldo pendiente en rojo). Por defecto neutral. */
  tone?: "default" | "success" | "danger" | "warning";
}

const TONE_COLORS: Record<
  NonNullable<DashboardStatCardProps["tone"]>,
  string
> = {
  default: colors.textPrimary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

/** Tile reutilizable label+valor para los contadores/totales del Dashboard. */
export function DashboardStatCard({
  label,
  value,
  tone = "default",
}: DashboardStatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: TONE_COLORS[tone] }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
  },
});
