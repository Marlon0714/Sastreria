import type { Schedule } from "./types";

/**
 * Saldo pendiente de un turno (price - abono). No se guarda en la base de
 * datos a propósito: se deriva siempre de price/abono para que nunca quede
 * desincronizado si se corrige cualquiera de los dos después.
 * Devuelve undefined si el turno no tiene precio (no hay saldo que calcular).
 */
export function computeSaldo(
  schedule: Pick<Schedule, "price" | "abono">,
): number | undefined {
  if (schedule.price == null) {
    return undefined;
  }
  return schedule.price - (schedule.abono ?? 0);
}
