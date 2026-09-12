import type { Client } from "../../clients/domain/types";
import { daysBetweenDates, localDateFromIso } from "../../schedule/domain/dateUtils";
import { resolveClientLabel } from "../../schedule/domain/clientLabel";
import type { Schedule } from "../../schedule/domain/types";

const OVERDUE_THRESHOLD_DAYS = 30;
const UPCOMING_THRESHOLD_DAYS = 15;

/**
 * Días de calendario transcurridos desde que un turno quedó "listo para
 * entregar" (`readyAt`, timestamp ISO) hasta `today` (YYYY-MM-DD). Se
 * normaliza `readyAt` a fecha local vía `localDateFromIso` antes de restar.
 */
export function daysWaitingSince(readyAtIso: string, today: string): number {
  return daysBetweenDates(localDateFromIso(readyAtIso), today);
}

export type ReadyScheduleClassification = "vencido" | "por_vencer" | null;

/**
 * Clasifica un turno "listo para entregar" según cuánto lleva esperando a
 * que lo recojan: `null` si no aplica (no está listo, o lleva menos de 15
 * días), `"por_vencer"` entre 15 y 29 días, `"vencido"` desde 30 días.
 * Cualquier otro status (incluido `"entregado"`) nunca clasifica.
 */
export function classifyReadySchedule(
  schedule: Pick<Schedule, "status" | "readyAt">,
  today: string,
): ReadyScheduleClassification {
  if (schedule.status !== "listo_para_entregar" || !schedule.readyAt) {
    return null;
  }
  const daysWaiting = daysWaitingSince(schedule.readyAt, today);
  if (daysWaiting >= OVERDUE_THRESHOLD_DAYS) return "vencido";
  if (daysWaiting >= UPCOMING_THRESHOLD_DAYS) return "por_vencer";
  return null;
}

export interface OverdueSplit {
  overdue: Schedule[];
  upcoming: Schedule[];
}

/**
 * Backlog GLOBAL (no acotado a ninguna semana) de turnos listos sin
 * recoger — ver Decisión 2 del plan: `readyAt` es un eje de tiempo
 * independiente de `date`, así que este split siempre recibe el universo
 * completo de turnos, nunca el recorte semanal.
 */
export function splitOverdueAndUpcoming(
  allSchedules: readonly Schedule[],
  today: string,
): OverdueSplit {
  const overdue: Schedule[] = [];
  const upcoming: Schedule[] = [];
  for (const schedule of allSchedules) {
    const classification = classifyReadySchedule(schedule, today);
    if (classification === "vencido") {
      overdue.push(schedule);
    } else if (classification === "por_vencer") {
      upcoming.push(schedule);
    }
  }
  return { overdue, upcoming };
}

export interface ReminderItem {
  schedule: Schedule;
  clientLabel: string;
  daysWaiting: number;
  severity: "vencido" | "por_vencer";
}

/**
 * Lista de recordatorios (turnos vencidos/por vencer) ordenada
 * descendentemente por días esperando — los más urgentes primero.
 */
export function buildReminderItems(
  schedules: readonly Schedule[],
  clientsById: ReadonlyMap<string, Client>,
  today: string,
): ReminderItem[] {
  const items: ReminderItem[] = [];
  for (const schedule of schedules) {
    const classification = classifyReadySchedule(schedule, today);
    if (!classification || !schedule.readyAt) continue;
    items.push({
      schedule,
      clientLabel: resolveClientLabel(schedule, clientsById),
      daysWaiting: daysWaitingSince(schedule.readyAt, today),
      severity: classification,
    });
  }
  return items.sort((a, b) => b.daysWaiting - a.daysWaiting);
}
