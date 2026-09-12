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
import { ErrorView, LoadingView, PeriodSelectorField } from "../../../shared/components";
import type { PeriodMode } from "../../../shared/domain/periodRange";
import { colors } from "../../../shared/theme/colors";
import { DashboardStatCard } from "../components/DashboardStatCard";
import { RemindersList } from "../components/RemindersList";
import { WeeklyWorkloadBreakdown } from "../components/WeeklyWorkloadBreakdown";
import type { PeriodStatusCounts } from "../domain/periodBreakdown";
import type { ScheduleListBucket } from "../domain/scheduleListBucket";
import { useDashboardStats } from "../hooks/useDashboardStats";

// Un solo lugar con la etiqueta visible Y el `cardLabel` de navegación de
// cada tarjeta de estado — evita duplicar el texto (ver Riesgo "Consistencia
// del título dinámico" del plan). El tipo `keyof PeriodStatusCounts` (en vez
// de `ScheduleListBucket`) es a propósito: son exactamente las claves que
// expone `periodStatusCounts` (aunque ya no se listen las 6 acá — ver
// N-112), así el value de cada tarjeta se indexa sin castear.
// N-112: se quitó la tarjeta de estado "Pendiente" de esta grilla — es
// estructuralmente idéntica a la tarjeta global (que sigue abajo, hoy
// etiquetada "Pendientes"), y ambas ya abren la misma lista de detalle desde
// N-105. El bucket "pendiente" en sí sigue existiendo en el dominio
// (periodStatusCounts, ScheduleListBucket, etc.), solo se quitó el acceso
// desde esta tarjeta.
const STATUS_CARD_BUCKETS: { bucket: keyof PeriodStatusCounts; label: string }[] = [
  { bucket: "total", label: "Total" },
  { bucket: "agendado", label: "Agendados" },
  { bucket: "en_proceso", label: "En proceso" },
  { bucket: "listo_para_entregar", label: "Listos" },
  { bucket: "entregado", label: "Entregados" },
];

// Mismo criterio que STATUS_CARD_BUCKETS: un solo lugar con el texto para no
// duplicarlo entre el label visible y el cardLabel de navegación. El texto
// pasó de "Sin fecha (global)" a "Pendientes": un turno sin fecha ES, por
// definición, un turno "pendiente" — mismo término ya usado en la Agenda.
// El bucket interno ("sin_fecha_global") y la lógica de conteo no cambian,
// solo este texto visible.
const GLOBAL_PENDING_LABEL = "Pendientes";

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
    range,
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

  // Revertido N-111: tocar un día del desglose semanal ya NO navega a la
  // Agenda — se queda en el propio Dashboard y cambia su selector de periodo
  // al modo "Día" anclado a esa fecha, como si el dueño lo hubiera elegido a
  // mano en `PeriodSelectorField`. `setMode("dia")` primero (deja el modo
  // consistente) y luego `jumpToDate(date)` (fija el `anchorDate` exacto);
  // en modo "dia" `setMode` no reubica `anchorDate` (ver
  // `normalizeAnchorForMode` en usePeriodSelector.ts, solo actúa en "mes"),
  // así que el orden no deja al hook desincronizado.
  const handlePressWeekDay = (date: string): void => {
    setMode("dia");
    jumpToDate(date);
  };

  // A diferencia de `handlePressReminder`, esta pantalla vive en el mismo
  // `DashboardStackNavigator` (no cruza de tab): `navigation.navigate`
  // directo. `range` puede ser `null` (rango incompleto/inválido) — en ese
  // caso `startDate`/`endDate` quedan `undefined` y el bucket resuelve a
  // lista vacía (salvo los buckets globales), igual que ya sucede con las
  // tarjetas en 0 mientras el rango está incompleto. `dateRange` es
  // explícito (no siempre `range`) para la tarjeta "Pendientes" (bucket
  // "sin_fecha_global"): es un bucket global, no acotado al periodo
  // seleccionado, así que no debe arrastrar `startDate`/`endDate` del
  // periodo actual por navegación.
  const handlePressStatCard = (
    bucket: ScheduleListBucket,
    cardLabel: string,
    dateRange: typeof range = range,
  ): void => {
    navigation.navigate("ScheduleListByStatus", {
      bucket,
      cardLabel,
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
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
            onPressDay={handlePressWeekDay}
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
              {STATUS_CARD_BUCKETS.map(({ bucket, label }) => (
                <DashboardStatCard
                  key={bucket}
                  label={label}
                  value={periodStatusCounts[bucket]}
                  onPress={() => handlePressStatCard(bucket, label)}
                />
              ))}
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
                onPress={() =>
                  handlePressStatCard("no_realizado", sectionTitles.notRealized)
                }
              />
              <DashboardStatCard
                label={GLOBAL_PENDING_LABEL}
                value={globalPendingCount}
                onPress={() =>
                  handlePressStatCard("sin_fecha_global", GLOBAL_PENDING_LABEL, null)
                }
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
