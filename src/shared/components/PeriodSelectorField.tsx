import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScheduleDateTimePickerField } from "./ScheduleDateTimePickerField";
import type { PeriodMode } from "../domain/periodRange";
import { colors } from "../theme/colors";

const PERIOD_MODE_OPTIONS: PeriodMode[] = ["dia", "semana", "mes", "rango"];

const PERIOD_MODE_LABELS: Record<PeriodMode, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
  rango: "Rango personalizado",
};

// El atajo reemplaza al "Ir a hoy" que tenía la Agenda antes de este cambio
// (Decisión 5 del plan de N-104) — no existe en "rango" (ver Decisión 7).
const CURRENT_PERIOD_SHORTCUT_LABELS: Record<Exclude<PeriodMode, "rango">, string> = {
  dia: "Ir a hoy",
  semana: "Semana actual",
  mes: "Mes actual",
};

interface PeriodSelectorFieldProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  periodLabel: string;
  anchorDate: string;
  onJumpToDate: (date: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoToCurrentPeriod: boolean;
  onGoToCurrentPeriod: () => void;
  customRangeStart: string | undefined;
  customRangeEnd: string | undefined;
  onCustomRangeStartChange: (date: string | undefined) => void;
  onCustomRangeEndChange: (date: string | undefined) => void;
  rangeError: string | null;
}

/**
 * Chip colapsado (Día/Semana/Mes/Rango personalizado) + navegación del
 * periodo activo. Mismo mecanismo de `isFilterMenuOpen`/`filterWrapper`/
 * `filterMenu` que `ScheduleDayViewScreen.tsx` (N-101) — sin `Modal`, con
 * `accessibilityRole="radio"` por opción (ver Tarea 14 del plan de N-104).
 * Compartido entre el Dashboard del dueño y "Mis arreglos" del operario
 * (ver plan de N-102).
 */
export function PeriodSelectorField({
  mode,
  onModeChange,
  periodLabel,
  anchorDate,
  onJumpToDate,
  onPrevious,
  onNext,
  canGoToCurrentPeriod,
  onGoToCurrentPeriod,
  customRangeStart,
  customRangeEnd,
  onCustomRangeStartChange,
  onCustomRangeEndChange,
  rangeError,
}: PeriodSelectorFieldProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.filterWrapper}>
        <Pressable
          accessibilityLabel="Cambiar periodo del resumen"
          accessibilityState={{ expanded: isMenuOpen }}
          style={styles.filterChip}
          onPress={() => setIsMenuOpen((open) => !open)}
        >
          <Text style={styles.filterChipText}>{PERIOD_MODE_LABELS[mode]}</Text>
          <Ionicons
            name={isMenuOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </Pressable>

        {isMenuOpen ? (
          <View style={styles.filterMenu}>
            {PERIOD_MODE_OPTIONS.map((option) => {
              const isActive = option === mode;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={`Ver resumen por ${PERIOD_MODE_LABELS[option].toLowerCase()}`}
                  style={[
                    styles.filterOption,
                    isActive && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    onModeChange(option);
                    setIsMenuOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      isActive && styles.filterOptionTextActive,
                    ]}
                  >
                    {PERIOD_MODE_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {mode === "rango" ? (
        <View style={styles.rangeFields}>
          <ScheduleDateTimePickerField
            mode="date"
            variant="field"
            allowClear={false}
            value={customRangeStart}
            onChange={onCustomRangeStartChange}
            placeholder="Fecha de inicio"
            accessibilityLabel="Fecha de inicio del rango"
          />
          <ScheduleDateTimePickerField
            mode="date"
            variant="field"
            allowClear={false}
            value={customRangeEnd}
            onChange={onCustomRangeEndChange}
            placeholder="Fecha de fin"
            accessibilityLabel="Fecha de fin del rango"
          />
          {rangeError ? <Text style={styles.rangeErrorText}>{rangeError}</Text> : null}
        </View>
      ) : (
        <>
          <View style={styles.navRow}>
            <Pressable
              accessibilityLabel="Periodo anterior"
              style={styles.navButton}
              onPress={onPrevious}
            >
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </Pressable>

            <Text style={styles.periodLabel} numberOfLines={1}>
              {periodLabel}
            </Text>

            {mode === "dia" ? (
              <ScheduleDateTimePickerField
                mode="date"
                variant="iconTrigger"
                value={anchorDate}
                onChange={(value) => {
                  if (value) onJumpToDate(value);
                }}
                placeholder="Elegir fecha"
                accessibilityLabel="Elegir fecha"
              />
            ) : null}

            <Pressable
              accessibilityLabel="Periodo siguiente"
              style={styles.navButton}
              onPress={onNext}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {canGoToCurrentPeriod ? (
            <Pressable
              accessibilityLabel={CURRENT_PERIOD_SHORTCUT_LABELS[mode]}
              style={styles.currentPeriodButton}
              onPress={onGoToCurrentPeriod}
            >
              <Text style={styles.currentPeriodButtonText}>
                {CURRENT_PERIOD_SHORTCUT_LABELS[mode]}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  filterWrapper: {
    paddingHorizontal: 16,
  },
  filterChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  filterMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primarySoft,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  periodLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  currentPeriodButton: {
    alignSelf: "center",
    marginTop: 2,
  },
  currentPeriodButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  rangeFields: {
    paddingHorizontal: 16,
    gap: 8,
  },
  rangeErrorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
