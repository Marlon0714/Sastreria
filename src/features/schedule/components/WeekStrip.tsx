import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";
import { todayDateString } from "../domain/dateUtils";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface WeekStripProps {
  /** Las 7 fechas (lunes a domingo) de la semana a mostrar. */
  weekDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function WeekStrip({
  weekDates,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: WeekStripProps) {
  const today = todayDateString();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Semana anterior"
        style={styles.navButton}
        onPress={onPrevWeek}
      >
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
      </Pressable>

      <View style={styles.days}>
        {weekDates.map((date, index) => {
          const dayNumber = Number(date.split("-")[2]);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              accessibilityLabel={`Ir al ${WEEKDAY_LABELS[index]} ${dayNumber}`}
              accessibilityState={{ selected: isSelected }}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => onSelectDate(date)}
            >
              <Text
                style={[
                  styles.weekdayLabel,
                  isSelected && styles.weekdayLabelSelected,
                ]}
              >
                {WEEKDAY_LABELS[index]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {dayNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel="Semana siguiente"
        style={styles.navButton}
        onPress={onNextWeek}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  days: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayChip: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    minWidth: 36,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  weekdayLabelSelected: {
    color: "#ffffff",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 2,
  },
  dayNumberSelected: {
    color: "#ffffff",
  },
  dayNumberToday: {
    color: colors.primary,
  },
});
