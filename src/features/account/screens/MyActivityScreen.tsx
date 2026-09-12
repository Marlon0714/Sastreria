import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ErrorView, LoadingView, PeriodSelectorField } from "../../../shared/components";
import type { PeriodMode } from "../../../shared/domain/periodRange";
import { colors } from "../../../shared/theme/colors";
import { formatPrice } from "../../pricing/domain/strings";
import { useMyActivity } from "../hooks/useMyActivity";

const CATEGORY_ICONS: Record<string, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};

// Copy dependiente del modo activo (mismo criterio que SECTION_TITLES en
// DashboardScreen.tsx — ver Tarea 16 del plan de N-102): texto de UI, no
// lógica de negocio.
const EMPTY_ACTIVITY_LABELS: Record<PeriodMode, string> = {
  dia: "No hiciste ningún arreglo este día.",
  semana: "No hiciste ningún arreglo esta semana.",
  mes: "No hiciste ningún arreglo este mes.",
  rango: "No hiciste ningún arreglo en este rango.",
};

const TOTAL_BAR_LABELS: Record<PeriodMode, string> = {
  dia: "Total bruto del día",
  semana: "Total bruto de la semana",
  mes: "Total bruto del mes",
  rango: "Total bruto del rango",
};

export default function MyActivityScreen() {
  const {
    mode,
    setMode,
    anchorDate,
    periodLabel,
    range,
    rangeError,
    goToPrevious,
    goToNext,
    goToCurrentPeriod,
    canGoToCurrentPeriod,
    jumpToDate,
    customRangeStart,
    customRangeEnd,
    setCustomRangeStart,
    setCustomRangeEnd,
    items,
    total,
    isLoading,
    error,
    priceError,
    reload,
    addPrice,
  } = useMyActivity();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Los tabs no desmontan esta pantalla al cambiar de pestaña, así que sin
  // esto el operario podría volver a "Precios" (ahora raíz de la pestaña) y
  // ver arreglos marcados "listo" en Agenda que ya no reflejan lo más
  // reciente.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading && items.length === 0) {
    return <LoadingView message="Cargando tus arreglos..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  const startAddingPrice = (scheduleId: string): void => {
    setEditingPriceId(scheduleId);
    setPriceInput("");
  };

  const saveAddedPrice = async (scheduleId: string): Promise<void> => {
    const parsed = parseInt(priceInput, 10);
    if (!priceInput || Number.isNaN(parsed)) return;
    setIsSavingPrice(true);
    const ok = await addPrice(scheduleId, parsed);
    setIsSavingPrice(false);
    if (ok) {
      setEditingPriceId(null);
      setPriceInput("");
    }
  };

  const isRangeIncomplete = mode === "rango" && range === null;

  return (
    <View style={styles.container}>
      <PeriodSelectorField
        mode={mode}
        onModeChange={setMode}
        periodLabel={periodLabel}
        anchorDate={anchorDate}
        onJumpToDate={jumpToDate}
        onPrevious={goToPrevious}
        onNext={goToNext}
        canGoToCurrentPeriod={canGoToCurrentPeriod}
        onGoToCurrentPeriod={goToCurrentPeriod}
        customRangeStart={customRangeStart}
        customRangeEnd={customRangeEnd}
        onCustomRangeStartChange={setCustomRangeStart}
        onCustomRangeEndChange={setCustomRangeEnd}
        rangeError={rangeError}
      />

      {isRangeIncomplete ? (
        <View style={styles.rangeIncompleteContainer}>
          <Text style={styles.emptyText}>
            {rangeError
              ? "Corrige el rango de fechas para ver tus arreglos."
              : "Elige fecha de inicio y fin para ver tus arreglos."}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {items.length === 0 ? (
              <Text style={styles.emptyText}>
                {EMPTY_ACTIVITY_LABELS[mode]}
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
                    ) : editingPriceId !== schedule.id ? (
                      <Pressable
                        accessibilityLabel={`Agregar precio de ${clientLabel}`}
                        onPress={() => startAddingPrice(schedule.id)}
                      >
                        <Text style={styles.addPriceText}>Agregar precio</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {editingPriceId === schedule.id ? (
                    <View style={styles.addPriceRow}>
                      <TextInput
                        accessibilityLabel="Precio del arreglo"
                        style={styles.addPriceInput}
                        placeholder="Ej: 15000"
                        placeholderTextColor={colors.textPlaceholder}
                        keyboardType="numeric"
                        value={priceInput}
                        onChangeText={(text) =>
                          setPriceInput(text.replace(/[^0-9]/g, ""))
                        }
                        autoFocus
                      />
                      <Pressable
                        accessibilityLabel="Cancelar precio"
                        onPress={() => setEditingPriceId(null)}
                      >
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Guardar precio"
                        style={[
                          styles.savePriceButton,
                          (isSavingPrice || !priceInput) && styles.disabled,
                        ]}
                        disabled={isSavingPrice || !priceInput}
                        onPress={() => void saveAddedPrice(schedule.id)}
                      >
                        <Text style={styles.savePriceButtonText}>
                          {isSavingPrice ? "Guardando..." : "Guardar"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {editingPriceId === schedule.id && priceError ? (
                    <Text style={styles.priceErrorText}>{priceError}</Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {items.length > 0 ? (
            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>{TOTAL_BAR_LABELS[mode]}</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rangeIncompleteContainer: {
    padding: 16,
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
    gap: 10,
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
  addPriceText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  addPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addPriceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  priceErrorText: {
    color: colors.danger,
    fontSize: 12,
  },
  savePriceButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  savePriceButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
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
