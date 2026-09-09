import type { Schedule } from "./types";

/**
 * Cuenta cuántos turnos de `schedulesOnDate` representan carga de trabajo
 * pendiente para ese día: se excluye `excludeId` (el propio turno en
 * edición, para no contarse a sí mismo) y se excluyen los turnos ya
 * `"entregado"` (ya no representan trabajo pendiente ese día, aunque sigan
 * apareciendo en la consulta por fecha). No hace falta excluir explícitamente
 * `"pendiente"` porque esos turnos no tienen `date` — nunca llegan dentro de
 * `schedulesOnDate`, que ya viene filtrada por `getByDate()`.
 */
export function countPendingSchedulesOnDate(
  schedulesOnDate: readonly Schedule[],
  excludeId: string | undefined,
): number {
  return schedulesOnDate.filter(
    (schedule) => schedule.id !== excludeId && schedule.status !== "entregado",
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
