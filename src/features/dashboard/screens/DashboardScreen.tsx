import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  DashboardStackParamList,
  RootTabParamList,
} from "../../../navigation/types";
import { formatPrice } from "../../pricing/domain/strings";
import { WeekStrip } from "../../schedule/components/WeekStrip";
import { formatDateForDisplay, todayDateString } from "../../schedule/domain/dateUtils";
import { ErrorView, LoadingView } from "../../../shared/components";
import { colors } from "../../../shared/theme/colors";
import { DashboardStatCard } from "../components/DashboardStatCard";
import { RemindersList } from "../components/RemindersList";
import { WeeklyWorkloadBreakdown } from "../components/WeeklyWorkloadBreakdown";
import { useDashboardStats } from "../hooks/useDashboardStats";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

export default function DashboardScreen({ navigation }: Props) {
  const {
    selectedDate,
    weekDates,
    selectDate,
    goToPreviousWeek,
    goToNextWeek,
    isLoading,
    error,
    reload,
    dailyWorkload,
    weeklyStatusCounts,
    weeklyMoneyTotals,
    notRealizedInWeek,
    globalPendingCount,
    reminders,
  } = useDashboardStats();

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
      <WeekStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onPrevWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
      />

      {selectedDate !== todayDateString() ? (
        <Pressable
          accessibilityLabel="Ir a hoy"
          style={styles.todayButton}
          onPress={() => selectDate(todayDateString())}
        >
          <Text style={styles.todayButtonText}>Ir a hoy</Text>
        </Pressable>
      ) : null}

      <Text style={styles.dateLabel} numberOfLines={1}>
        {formatDateForDisplay(selectedDate)}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carga de trabajo de la semana</Text>
        <WeeklyWorkloadBreakdown weekDates={weekDates} counts={dailyWorkload} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Turnos de la semana por estado</Text>
        <View style={styles.statGrid}>
          <DashboardStatCard label="Total" value={weeklyStatusCounts.total} />
          <DashboardStatCard
            label="Pendientes"
            value={weeklyStatusCounts.pendiente}
          />
          <DashboardStatCard
            label="Agendados"
            value={weeklyStatusCounts.agendado}
          />
          <DashboardStatCard
            label="En proceso"
            value={weeklyStatusCounts.en_proceso}
          />
          <DashboardStatCard
            label="Listos"
            value={weeklyStatusCounts.listo_para_entregar}
          />
          <DashboardStatCard
            label="Entregados"
            value={weeklyStatusCounts.entregado}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dinero de la semana</Text>
        <View style={styles.statGrid}>
          <DashboardStatCard
            label="Total cotizado"
            value={formatPrice(weeklyMoneyTotals.totalPrice)}
          />
          <DashboardStatCard
            label="Total abonado"
            value={formatPrice(weeklyMoneyTotals.totalAbono)}
            tone="success"
          />
          <DashboardStatCard
            label="Saldo pendiente"
            value={formatPrice(weeklyMoneyTotals.totalSaldoPendiente)}
            tone="warning"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Otros indicadores</Text>
        <View style={styles.statGrid}>
          <DashboardStatCard
            label="No realizados esta semana"
            value={notRealizedInWeek}
            tone="danger"
          />
          <DashboardStatCard
            label="Sin fecha (global)"
            value={globalPendingCount}
          />
        </View>
      </View>

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
  dateLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
    marginTop: 8,
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
  section: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
