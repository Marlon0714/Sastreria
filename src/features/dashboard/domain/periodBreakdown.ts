import { countPendingSchedulesOnDate } from "../../schedule/domain/scheduleWorkloadCount";
import type { Schedule, ScheduleStatus } from "../../schedule/domain/types";

/**
 * Turnos de `schedules` cuya `date` cae dentro de `[startDate, endDate]`
 * (comparación lexicográfica de strings `YYYY-MM-DD`, mismo truco que
 * `computeNotRealizedInPeriod`/`overdueSchedules.ts` — funciona porque el
 * formato ya viene con ceros a la izquierda). Deliberadamente sin
 * construir un `Set` de fechas (como sí hacía la versión semanal): un
 * rango puede llegar a abarcar hasta 366 días (ver `periodRange.ts`), y la
 * comparación de strings escala igual de bien para 1 día que para un año.
 * Los turnos sin `date` (los únicos con `status: "pendiente"` — ver
 * `statusDerivation.ts`) nunca pertenecen a ningún periodo; quedan siempre
 * excluidos de este filtro.
 */
export function filterSchedulesInRange(
  schedules: readonly Schedule[],
  startDate: string,
  endDate: string,
): Schedule[] {
  return schedules.filter(
    (schedule) =>
      schedule.date != null &&
      schedule.date >= startDate &&
      schedule.date <= endDate,
  );
}

/**
 * Carga de trabajo (turnos no entregados) para cada uno de los 7 días de
 * `weekDates`, en el mismo orden — reutiliza `countPendingSchedulesOnDate`
 * (misma noción de "carga de trabajo" que ya usa el formulario de turnos).
 * Exclusivo del modo "Semana" del selector de periodo (ver Decisión 8 del
 * plan de N-104): un desglose día-por-día no tiene el mismo valor ni cabe
 * visualmente para un mes (hasta 31 columnas) o un rango (hasta 366).
 */
export function countSchedulesByDayOfWeek(
  schedulesInWeek: readonly Schedule[],
  weekDates: readonly string[],
): number[] {
  return weekDates.map((date) => {
    const schedulesOnDate = schedulesInWeek.filter(
      (schedule) => schedule.date === date,
    );
    return countPendingSchedulesOnDate(schedulesOnDate, undefined);
  });
}

export interface PeriodStatusCounts {
  total: number;
  /**
   * Siempre 0 dentro de un recorte por periodo: `deriveScheduleStatus`
   * solo asigna `"pendiente"` cuando el turno NO tiene `date`, y
   * `filterSchedulesInRange` exige `date` para pertenecer al periodo — por
   * construcción, ningún turno "del periodo" (sea día, semana, mes o
   * rango) puede estar "pendiente". Se mantiene el campo (en 0) para no
   * romper el contrato de "6 contadores" pedido — ver Decisión 3 del plan
   * original (N-099). `computeGlobalPendingCount` (más abajo) es el
   * contador real de turnos sin fecha, fuera de cualquier periodo.
   */
  pendiente: number;
  agendado: number;
  en_proceso: number;
  listo_para_entregar: number;
  entregado: number;
}

export function computeStatusCounts(
  schedulesInPeriod: readonly Schedule[],
): PeriodStatusCounts {
  const counts: PeriodStatusCounts = {
    total: schedulesInPeriod.length,
    pendiente: 0,
    agendado: 0,
    en_proceso: 0,
    listo_para_entregar: 0,
    entregado: 0,
  };
  for (const schedule of schedulesInPeriod) {
    counts[schedule.status] += 1;
  }
  return counts;
}

export interface PeriodMoneyTotals {
  totalPrice: number;
  totalAbono: number;
  /** price - abono, sumado sobre todo el periodo (ver saldo.ts para el cálculo por turno). */
  totalSaldoPendiente: number;
}

export function computePeriodMoneyTotals(
  schedulesInPeriod: readonly Schedule[],
): PeriodMoneyTotals {
  const totalPrice = schedulesInPeriod.reduce(
    (sum, schedule) => sum + (schedule.price ?? 0),
    0,
  );
  const totalAbono = schedulesInPeriod.reduce(
    (sum, schedule) => sum + (schedule.abono ?? 0),
    0,
  );
  return {
    totalPrice,
    totalAbono,
    totalSaldoPendiente: totalPrice - totalAbono,
  };
}

const NOT_REALIZED_STATUSES: readonly ScheduleStatus[] = [
  "pendiente",
  "agendado",
];

/**
 * Turnos del periodo que ya deberían haberse atendido y no avanzaron:
 * `date` anterior a `today` (comparación lexicográfica de strings
 * YYYY-MM-DD, igual que el resto de la app) y `status` todavía
 * `"pendiente"` o `"agendado"` — nunca llegó a tener operario asignado.
 * `date === today` nunca cuenta como "no realizado" todavía: el día no ha
 * terminado. Válido para cualquier periodo (día/semana/mes/rango), no solo
 * semana.
 */
export function filterNotRealizedInPeriod(
  schedulesInPeriod: readonly Schedule[],
  today: string,
): Schedule[] {
  return schedulesInPeriod.filter(
    (schedule) =>
      schedule.date != null &&
      schedule.date < today &&
      NOT_REALIZED_STATUSES.includes(schedule.status),
  );
}

export function computeNotRealizedInPeriod(
  schedulesInPeriod: readonly Schedule[],
  today: string,
): number {
  return filterNotRealizedInPeriod(schedulesInPeriod, today).length;
}

/**
 * Turnos sin fecha asignada, cualquiera sea su status — mismo universo que
 * `ScheduleRepository.getWithoutDate()` usa para la pestaña "Pendientes"
 * de la Agenda, derivado acá en JS sobre `allSchedules` (ya traído
 * completo por `useDashboardStats`) en vez de una consulta aparte. No
 * acotado a ningún periodo seleccionado (ver `computeGlobalPendingCount`).
 */
export function filterGlobalPending(
  allSchedules: readonly Schedule[],
): Schedule[] {
  return allSchedules.filter((schedule) => schedule.date == null);
}

/**
 * Contador global (no acotado a ningún periodo seleccionado) de turnos sin
 * fecha asignada, cualquiera sea su status. Ver Decisión 3 del plan
 * original (N-099): reemplazo/complemento al contador "pendiente" de
 * `computeStatusCounts`, que estructuralmente siempre da 0.
 */
export function computeGlobalPendingCount(
  allSchedules: readonly Schedule[],
): number {
  return filterGlobalPending(allSchedules).length;
}
