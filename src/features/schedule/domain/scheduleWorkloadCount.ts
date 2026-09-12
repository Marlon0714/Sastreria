import type { Schedule, ScheduleCategory } from "./types";

/**
 * Cuenta cuántos turnos de `schedulesOnDate` representan carga de trabajo
 * pendiente para ese día: se excluye `excludeId` (el propio turno en
 * edición, para no contarse a sí mismo) y se excluyen los turnos ya
 * `"entregado"` (ya no representan trabajo pendiente ese día, aunque sigan
 * apareciendo en la consulta por fecha). No hace falta excluir explícitamente
 * `"pendiente"` porque esos turnos no tienen `date` — nunca llegan dentro de
 * `schedulesOnDate`, que ya viene filtrada por `getByDate()`.
 *
 * `category`, si se pasa, acota el conteo a turnos de esa misma categoría —
 * lo usa el formulario de turnos (ScheduleFormScreen), donde un "arreglo" no
 * debe verse afectado por cuántas "confecciones" hay ese día, y viceversa.
 * Sin `category` (ej. el resumen semanal del dashboard), cuenta la carga de
 * trabajo total del día sin distinguir categoría.
 */
export function countPendingSchedulesOnDate(
  schedulesOnDate: readonly Schedule[],
  excludeId: string | undefined,
  category?: ScheduleCategory,
): number {
  return schedulesOnDate.filter(
    (schedule) =>
      schedule.id !== excludeId &&
      schedule.status !== "entregado" &&
      (category === undefined || schedule.category === category),
  ).length;
}

/**
 * Texto informativo para mostrar en el formulario según el conteo de turnos
 * ya agendados para la fecha elegida — singular/plural/cero resueltos acá
 * para no repetir esta lógica en la pantalla.
 */
export function formatPendingScheduleCountLabel(count: number): string {
  if (count === 0) {
    return "Ningún turno agendado todavía";
  }
  if (count === 1) {
    return "1 turno ya agendado para este día";
  }
  return `${count} turnos ya agendados para este día`;
}
