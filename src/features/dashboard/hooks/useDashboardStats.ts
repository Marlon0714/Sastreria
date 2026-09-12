import { useCallback, useEffect, useMemo, useState } from "react";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import { type DateRange, todayDateString } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import {
  buildReminderItems,
  splitOverdueAndUpcoming,
  type ReminderItem,
} from "../domain/overdueSchedules";
import {
  computeGlobalPendingCount,
  computeNotRealizedInPeriod,
  computePeriodMoneyTotals,
  computeStatusCounts,
  countSchedulesByDayOfWeek,
  filterSchedulesInRange,
  type PeriodMoneyTotals,
  type PeriodStatusCounts,
} from "../domain/periodBreakdown";
import type { PeriodMode } from "../domain/periodRange";
import { usePeriodSelector } from "./usePeriodSelector";

export interface UseDashboardStatsResult {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  anchorDate: string;
  periodLabel: string;
  range: DateRange | null;
  rangeError: string | null;
  /** `true` si el modo es "rango" y todavía falta elegir alguna fecha. */
  isRangeIncomplete: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrentPeriod: () => void;
  canGoToCurrentPeriod: boolean;
  jumpToDate: (date: string) => void;
  customRangeStart: string | undefined;
  customRangeEnd: string | undefined;
  setCustomRangeStart: (date: string | undefined) => void;
  setCustomRangeEnd: (date: string | undefined) => void;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Carga de trabajo (turnos no entregados) por día, lunes..domingo — `[]` fuera del modo "semana". */
  dailyWorkload: number[];
  periodStatusCounts: PeriodStatusCounts;
  periodMoneyTotals: PeriodMoneyTotals;
  notRealizedInPeriod: number;
  /** Global (no acotado al periodo): turnos sin fecha asignada — ver Decisión 3 del plan original (N-099). */
  globalPendingCount: number;
  /** Global: turnos "listo_para_entregar" con 30+ días esperando. */
  overdueCount: number;
  /** Global: turnos "listo_para_entregar" con 15-29 días esperando. */
  upcomingCount: number;
  /** Vencidos + por vencer, ordenados por urgencia (ver buildReminderItems). */
  reminders: ReminderItem[];
}

const EMPTY_STATUS_COUNTS: PeriodStatusCounts = {
  total: 0,
  pendiente: 0,
  agendado: 0,
  en_proceso: 0,
  listo_para_entregar: 0,
  entregado: 0,
};

const EMPTY_MONEY_TOTALS: PeriodMoneyTotals = {
  totalPrice: 0,
  totalAbono: 0,
  totalSaldoPendiente: 0,
};

/**
 * Resumen agregado del negocio para el dueño: trae `schedules`/`clients`
 * completos UNA vez (igual patrón que `useMyActivity`/`useScheduleDayView`)
 * y deriva todo lo demás en JS con `useMemo` al navegar de periodo, sin
 * volver a pegarle a la base de datos. El periodo (día/semana/mes/rango) lo
 * maneja `usePeriodSelector` — ver Tarea 12 del plan de N-104.
 */
export function useDashboardStats(): UseDashboardStatsResult {
  const clientRepository = useClientRepository();
  // `weekDatesForBreakdown` es un detalle interno para derivar
  // `dailyWorkload` (ver más abajo) — no forma parte del contrato público
  // de este hook (no está en `UseDashboardStatsResult`).
  const { weekDatesForBreakdown, ...periodSelector } = usePeriodSelector();
  const { mode, range } = periodSelector;
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [clientsById, setClientsById] = useState<Map<string, Client>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // `range` es `null` en modo "rango" tanto si falta elegir alguna fecha
  // (incompleto, sin `rangeError`) como si ya se eligieron pero son
  // inválidas (fin antes que inicio, o span > 366 días, con `rangeError`
  // ya seteado por usePeriodSelector/periodRange.ts). En ambos casos NO se
  // deben mostrar tarjetas en cero (serían engañosas): `isRangeIncomplete`
  // cubre los dos, y es la pantalla (`DashboardScreen`) la que distingue el
  // texto a mostrar según si `rangeError` está presente o no (Decisión 7
  // del plan de N-104 — corregido tras revisión: antes el error se mostraba
  // A LA VEZ que el mensaje genérico de "elige una fecha").
  const schedulesInPeriod = useMemo(
    () =>
      range ? filterSchedulesInRange(allSchedules, range.startDate, range.endDate) : [],
    [allSchedules, range],
  );

  // Exclusivo del modo "Semana" (Decisión 8 del plan): un desglose
  // día-por-día no cabe ni tiene el mismo valor para Mes (hasta 31
  // columnas) o Rango (hasta 366).
  const dailyWorkload = useMemo(
    () =>
      mode === "semana" && weekDatesForBreakdown
        ? countSchedulesByDayOfWeek(schedulesInPeriod, weekDatesForBreakdown)
        : [],
    [mode, weekDatesForBreakdown, schedulesInPeriod],
  );

  const periodStatusCounts = useMemo(
    () => (range ? computeStatusCounts(schedulesInPeriod) : EMPTY_STATUS_COUNTS),
    [range, schedulesInPeriod],
  );

  const periodMoneyTotals = useMemo(
    () =>
      range ? computePeriodMoneyTotals(schedulesInPeriod) : EMPTY_MONEY_TOTALS,
    [range, schedulesInPeriod],
  );

  const notRealizedInPeriod = useMemo(
    () => (range ? computeNotRealizedInPeriod(schedulesInPeriod, today) : 0),
    [range, schedulesInPeriod, today],
  );

  const globalPendingCount = useMemo(
    () => computeGlobalPendingCount(allSchedules),
    [allSchedules],
  );

  // Vencidos/por-vencer/reminders siempre sobre `allSchedules` completo,
  // nunca el recorte por periodo — son GLOBALES (ver Decisión 3 del plan de
  // N-104 / N-099): `readyAt` es un eje de tiempo independiente de `date`,
  // no cambia si el dueño está viendo "Día", "Mes" o cualquier rango.
  const overdueSplit = useMemo(
    () => splitOverdueAndUpcoming(allSchedules, today),
    [allSchedules, today],
  );

  const reminders = useMemo(
    () => buildReminderItems(allSchedules, clientsById, today),
    [allSchedules, clientsById, today],
  );

  return {
    ...periodSelector,
    isRangeIncomplete: mode === "rango" && range === null,
    isLoading,
    error,
    reload: load,
    dailyWorkload,
    periodStatusCounts,
    periodMoneyTotals,
    notRealizedInPeriod,
    globalPendingCount,
    overdueCount: overdueSplit.overdue.length,
    upcomingCount: overdueSplit.upcoming.length,
    reminders,
  };
}
