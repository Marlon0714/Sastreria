import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ErrorView, LoadingView } from "../../../shared/components";
import { colors } from "../../../shared/theme/colors";
import { formatPrice } from "../../pricing/domain/strings";
import {
  formatDateForDisplay,
  shiftDateString,
  todayDateString,
} from "../../schedule/domain/dateUtils";
import { useMyActivity } from "../hooks/useMyActivity";

const CATEGORY_ICONS: Record<string, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};

export default function MyActivityScreen() {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const { items, total, isLoading, error, reload } =
    useMyActivity(selectedDate);

  if (isLoading && items.length === 0) {
    return <LoadingView message="Cargando tus arreglos..." />;
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
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>

        <Text style={styles.dateLabel} numberOfLines={1}>
          {formatDateForDisplay(selectedDate)}
        </Text>

        <Pressable
          accessibilityLabel="Día siguiente"
          style={styles.navButton}
          onPress={() =>
            setSelectedDate((current) => shiftDateString(current, 1))
          }
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
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
        {items.length === 0 ? (
          <Text style={styles.emptyText}>
            No hiciste ningún arreglo este día.
          </Text>
        ) : (
          items.map(({ schedule, clientLabel }) => (
            <View key={schedule.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardClient} numberOfLines={1}>
                  {CATEGORY_ICONS[schedule.category] ?? ""} {clientLabel}
                </Text>
                {schedule.price != null ? (
                  <Text style={styles.cardPrice}>
                    {formatPrice(schedule.price)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Total del día</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  dateLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
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
    gap: 12,
    flexGrow: 1,
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
  cardPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
});
