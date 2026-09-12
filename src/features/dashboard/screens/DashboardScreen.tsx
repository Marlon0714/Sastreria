import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  DashboardStackParamList,
  RootTabParamList,
} from "../../../navigation/types";
import { formatPrice } from "../../pricing/domain/strings";
import { getWeekDates } from "../../schedule/domain/dateUtils";
import { ErrorView, LoadingView } from "../../../shared/components";
import { colors } from "../../../shared/theme/colors";
import { DashboardStatCard } from "../components/DashboardStatCard";
import { PeriodSelectorField } from "../components/PeriodSelectorField";
import { RemindersList } from "../components/RemindersList";
import { WeeklyWorkloadBreakdown } from "../components/WeeklyWorkloadBreakdown";
import type { PeriodMode } from "../domain/periodRange";
import { useDashboardStats } from "../hooks/useDashboardStats";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

// Copy dependiente del modo activo (Decisión 10 del plan de N-104): texto de
// UI, no lógica de negocio — mismo criterio ya usado en
// FILTER_OPTION_LABELS/STATUS_LABELS de ScheduleDayViewScreen.tsx.
const SECTION_TITLES: Record<
  PeriodMode,
  { statusQuestion: string; billing: string; notRealized: string }
> = {
  dia: {
    statusQuestion: "¿Cómo van los turnos de este día?",
    billing: "Facturación del día",
    notRealized: "No realizados este día",
  },
  semana: {
    statusQuestion: "¿Cómo van los turnos de esta semana?",
    billing: "Facturación de la semana",
    notRealized: "No realizados esta semana",
  },
  mes: {
    statusQuestion: "¿Cómo van los turnos de este mes?",
    billing: "Facturación del mes",
    notRealized: "No realizados este mes",
  },
  rango: {
    statusQuestion: "¿Cómo van los turnos de este rango?",
    billing: "Facturación del rango",
    notRealized: "No realizados en el rango",
  },
};

export default function DashboardScreen({ navigation }: Props) {
  const {
    mode,
    setMode,
    anchorDate,
    periodLabel,
    rangeError,
    isRangeIncomplete,
    goToPrevious,
    goToNext,
    goToCurrentPeriod,
    canGoToCurrentPeriod,
    jumpToDate,
    customRangeStart,
    customRangeEnd,
    setCustomRangeStart,
    setCustomRangeEnd,
    isLoading,
    error,
    reload,
    dailyWorkload,
    periodStatusCounts,
    periodMoneyTotals,
    notRealizedInPeriod,
    globalPendingCount,
    reminders,
  } = useDashboardStats();
  const sectionTitles = SECTION_TITLES[mode];
  // Solo se usa dentro de WeeklyWorkloadBreakdown (exclusivo de "Semana" —
  // Decisión 8 del plan): no forma parte del contrato de useDashboardStats,
  // se deriva acá igual que ya hacía esta pantalla con `weekDates` antes de
  // este cambio (patrón cruzado dashboard/dateUtils ya aceptado, ver N-012).
  const weekDatesForBreakdown = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

  // Los tabs no desmontan esta pantalla al cambiar de pestaña, así que sin
  // esto el dueño podría volver a "Inicio" y ver cifras desactualizadas —
  // mismo patrón que MyActivityScreen/ScheduleDayViewScreen.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Primera vez que este proyecto navega desde una pestaña a una pantalla
  // hija de OTRO stack con params (ver Decisión 7 del plan): se combina
  // `getParent<NavigationProp<RootTabParamList>>()` (ya usado en
  // ClientListScreen para escuchar foco) con la sintaxis anidada
  // `navigate(tab, { screen, params })` (ya usada en AppHeader para
  // "MyAccount", sin params ahí).
  const handlePressReminder = (scheduleId: string): void => {
    const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
    parent?.navigate("ScheduleTab", {
      screen: "ScheduleForm",
      params: { scheduleId },
    });
  };

  if (isLoading) {
    return <LoadingView message="Cargando resumen del negocio..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
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

      {mode === "semana" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Turnos agendados por día</Text>
          <WeeklyWorkloadBreakdown
            weekDates={weekDatesForBreakdown}
            counts={dailyWorkload}
          />
        </View>
      ) : null}

      {mode === "rango" && isRangeIncomplete ? (
        <View style={styles.section}>
          <Text style={styles.emptyStateText}>
            {rangeError
              ? "Corrige el rango de fechas para ver el resumen."
              : "Elige fecha de inicio y fin para ver el resumen."}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {sectionTitles.statusQuestion}
            </Text>
            <View style={styles.statGrid}>
              <DashboardStatCard
                label="Total"
                value={periodStatusCounts.total}
              />
              <DashboardStatCard
                label="Pendientes"
                value={periodStatusCounts.pendiente}
              />
              <DashboardStatCard
                label="Agendados"
                value={periodStatusCounts.agendado}
              />
              <DashboardStatCard
                label="En proceso"
                value={periodStatusCounts.en_proceso}
              />
              <DashboardStatCard
                label="Listos"
                value={periodStatusCounts.listo_para_entregar}
              />
              <DashboardStatCard
                label="Entregados"
                value={periodStatusCounts.entregado}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{sectionTitles.billing}</Text>
            <View style={styles.statGrid}>
              <DashboardStatCard
                label="Valor total de los trabajos"
                value={formatPrice(periodMoneyTotals.totalPrice)}
              />
              <DashboardStatCard
                label="Total pagado por los clientes"
                value={formatPrice(periodMoneyTotals.totalAbono)}
                tone="success"
              />
              <DashboardStatCard
                label="Falta por cobrar"
                value={formatPrice(periodMoneyTotals.totalSaldoPendiente)}
                tone="warning"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Otros indicadores</Text>
            <View style={styles.statGrid}>
              <DashboardStatCard
                label={sectionTitles.notRealized}
                value={notRealizedInPeriod}
                tone="danger"
              />
              <DashboardStatCard
                label="Sin fecha (global)"
                value={globalPendingCount}
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recordatorios</Text>
        <RemindersList items={reminders} onPressItem={handlePressReminder} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
});
