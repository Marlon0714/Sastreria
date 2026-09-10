import { useCallback, useEffect, useMemo, useState } from "react";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import {
  getWeekDates,
  shiftDateString,
  todayDateString,
} from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import {
  buildReminderItems,
  splitOverdueAndUpcoming,
  type ReminderItem,
} from "../domain/overdueSchedules";
import {
  computeGlobalPendingCount,
  computeNotRealizedInWeek,
  computeWeeklyMoneyTotals,
  computeWeeklyStatusCounts,
  countSchedulesByDayOfWeek,
  filterSchedulesInWeek,
  type WeeklyMoneyTotals,
  type WeeklyStatusCounts,
} from "../domain/weeklyBreakdown";

export interface UseDashboardStatsResult {
  selectedDate: string;
  weekDates: string[];
  selectDate: (date: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Carga de trabajo (turnos no entregados) por día, lunes..domingo. */
  dailyWorkload: number[];
  weeklyStatusCounts: WeeklyStatusCounts;
  weeklyMoneyTotals: WeeklyMoneyTotals;
  notRealizedInWeek: number;
  /** Global (no acotado a la semana): turnos sin fecha asignada — ver Decisión 3 del plan. */
  globalPendingCount: number;
  /** Global: turnos "listo_para_entregar" con 30+ días esperando. */
  overdueCount: number;
  /** Global: turnos "listo_para_entregar" con 15-29 días esperando. */
  upcomingCount: number;
  /** Vencidos + por vencer, ordenados por urgencia (ver buildReminderItems). */
  reminders: ReminderItem[];
}

/**
 * Resumen agregado del negocio para el dueño: trae `schedules`/`clients`
 * completos UNA vez (igual patrón que `useMyActivity`/`useScheduleDayView`)
 * y deriva todo lo demás en JS con `useMemo` al navegar de semana, sin
 * volver a pegarle a la base de datos — ver Tarea 7 del plan.
 */
export function useDashboardStats(): UseDashboardStatsResult {
  const clientRepository = useClientRepository();
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [clientsById, setClientsById] = useState<Map<string, Client>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const scheduleRepository = getDefaultScheduleRepository();
      const [schedules, clients] = await Promise.all([
        scheduleRepository.getAll(),
        clientRepository.findAll(),
      ]);
      setAllSchedules(schedules);
      setClientsById(new Map(clients.map((client) => [client.id, client])));
    } catch {
      setError("No se pudo cargar el resumen del negocio.");
    } finally {
      setIsLoading(false);
    }
    // clientRepository no entra en las deps a propósito: es un singleton
    // provisto una sola vez (ver App.tsx) que nunca cambia en producción —
    // mismo comentario que useMyActivity.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayDateString();

  const schedulesInWeek = useMemo(
    () => filterSchedulesInWeek(allSchedules, weekDates),
    [allSchedules, weekDates],
  );

  const dailyWorkload = useMemo(
    () => countSchedulesByDayOfWeek(schedulesInWeek, weekDates),
    [schedulesInWeek, weekDates],
  );

  const weeklyStatusCounts = useMemo(
    () => computeWeeklyStatusCounts(schedulesInWeek),
    [schedulesInWeek],
  );

  const weeklyMoneyTotals = useMemo(
    () => computeWeeklyMoneyTotals(schedulesInWeek),
    [schedulesInWeek],
  );

  const notRealizedInWeek = useMemo(
    () => computeNotRealizedInWeek(schedulesInWeek, today),
    [schedulesInWeek, today],
  );

  const globalPendingCount = useMemo(
    () => computeGlobalPendingCount(allSchedules),
    [allSchedules],
  );

  const overdueSplit = useMemo(
    () => splitOverdueAndUpcoming(allSchedules, today),
    [allSchedules, today],
  );

  const reminders = useMemo(
    () => buildReminderItems(allSchedules, clientsById, today),
    [allSchedules, clientsById, today],
  );

  const goToPreviousWeek = useCallback((): void => {
    setSelectedDate((current) => shiftDateString(current, -7));
  }, []);

  const goToNextWeek = useCallback((): void => {
    setSelectedDate((current) => shiftDateString(current, 7));
  }, []);

  return {
    selectedDate,
    weekDates,
    selectDate: setSelectedDate,
    goToPreviousWeek,
    goToNextWeek,
    isLoading,
    error,
    reload: load,
    dailyWorkload,
    weeklyStatusCounts,
    weeklyMoneyTotals,
    notRealizedInWeek,
    globalPendingCount,
    overdueCount: overdueSplit.overdue.length,
    upcomingCount: overdueSplit.upcoming.length,
    reminders,
  };
}
