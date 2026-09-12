import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  /** Tono opcional del valor (ej. saldo pendiente en rojo). Por defecto neutral. */
  tone?: "default" | "success" | "danger" | "warning";
  /**
   * Si viene, la tarjeta se vuelve tocable (navega al detalle del bucket
   * de turnos detrás del número) — las 3 tarjetas de "Facturación" no lo
   * reciben y quedan como `View`, igual que antes de esta prop.
   */
  onPress?: () => void;
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
  onPress,
}: DashboardStatCardProps) {
  const content = (
    <>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: TONE_COLORS[tone] }]}>
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={styles.card}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${label}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
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
