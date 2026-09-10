import { countPendingSchedulesOnDate } from "../../schedule/domain/scheduleWorkloadCount";
import type { Schedule, ScheduleStatus } from "../../schedule/domain/types";

/**
 * Turnos de `schedules` cuya `date` cae dentro de `weekDates` (las 7 fechas
 * lunes..domingo de la semana seleccionada). Los turnos sin `date` (los
 * únicos con `status: "pendiente"` — ver `statusDerivation.ts`) nunca
 * pertenecen a ninguna semana; quedan siempre excluidos de este filtro.
 */
export function filterSchedulesInWeek(
  schedules: readonly Schedule[],
  weekDates: readonly string[],
): Schedule[] {
  const weekDatesSet = new Set(weekDates);
  return schedules.filter(
    (schedule) => schedule.date != null && weekDatesSet.has(schedule.date),
  );
}

/**
 * Carga de trabajo (turnos no entregados) para cada uno de los 7 días de
 * `weekDates`, en el mismo orden — reutiliza `countPendingSchedulesOnDate`
 * (misma noción de "carga de trabajo" que ya usa el formulario de turnos).
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

export interface WeeklyStatusCounts {
  total: number;
  /**
   * Siempre 0 dentro de un recorte semanal: `deriveScheduleStatus` solo
   * asigna `"pendiente"` cuando el turno NO tiene `date`, y
   * `filterSchedulesInWeek` exige `date` para pertenecer a la semana — por
   * construcción, ningún turno "de la semana" puede estar "pendiente". Se
   * mantiene el campo (en 0) para no romper el contrato de "6 contadores"
   * pedido — ver Decisión 3 del plan. `computeGlobalPendingCount` (más
   * abajo) es el contador real de turnos sin fecha, fuera del bloque
   * semanal.
   */
  pendiente: number;
  agendado: number;
  en_proceso: number;
  listo_para_entregar: number;
  entregado: number;
}

export function computeWeeklyStatusCounts(
  schedulesInWeek: readonly Schedule[],
): WeeklyStatusCounts {
  const counts: WeeklyStatusCounts = {
    total: schedulesInWeek.length,
    pendiente: 0,
    agendado: 0,
    en_proceso: 0,
    listo_para_entregar: 0,
    entregado: 0,
  };
  for (const schedule of schedulesInWeek) {
    counts[schedule.status] += 1;
  }
  return counts;
}

export interface WeeklyMoneyTotals {
  totalPrice: number;
  totalAbono: number;
  /** price - abono, sumado sobre toda la semana (ver saldo.ts para el cálculo por turno). */
  totalSaldoPendiente: number;
}

export function computeWeeklyMoneyTotals(
  schedulesInWeek: readonly Schedule[],
): WeeklyMoneyTotals {
  const totalPrice = schedulesInWeek.reduce(
    (sum, schedule) => sum + (schedule.price ?? 0),
    0,
  );
  const totalAbono = schedulesInWeek.reduce(
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
 * Turnos de la semana que ya deberían haberse atendido y no avanzaron:
 * `date` anterior a `today` (comparación lexicográfica de strings
 * YYYY-MM-DD, igual que el resto de la app) y `status` todavía
 * `"pendiente"` o `"agendado"` — nunca llegó a tener operario asignado.
 * `date === today` nunca cuenta como "no realizado" todavía: el día no ha
 * terminado.
 */
export function computeNotRealizedInWeek(
  schedulesInWeek: readonly Schedule[],
  today: string,
): number {
  return schedulesInWeek.filter(
    (schedule) =>
      schedule.date != null &&
      schedule.date < today &&
      NOT_REALIZED_STATUSES.includes(schedule.status),
  ).length;
}

/**
 * Contador global (no acotado a la semana seleccionada) de turnos sin
 * fecha asignada, cualquiera sea su status — mismo universo que
 * `ScheduleRepository.getWithoutDate()` usa para la pestaña "Pendientes"
 * de la Agenda, derivado acá en JS sobre `allSchedules` (ya traído
 * completo por `useDashboardStats`) en vez de una consulta aparte. Ver
 * Decisión 3 del plan: reemplazo/complemento al contador "pendiente" de
 * `computeWeeklyStatusCounts`, que estructuralmente siempre da 0.
 */
export function computeGlobalPendingCount(
  allSchedules: readonly Schedule[],
): number {
  return allSchedules.filter((schedule) => schedule.date == null).length;
}
