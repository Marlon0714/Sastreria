import type { Client } from "../../clients/domain/types";
import type { Schedule } from "./types";

/**
 * Resuelve el texto de "cliente" de un turno: cliente registrado por
 * nombre, "Cliente eliminado" si `clientId` ya no existe en `clientsById`,
 * el nombre libre (`unregisteredClientName`) si el turno se agendó sin
 * registrar cliente, o "Cliente" como último fallback.
 *
 * Extraída de la lógica ya duplicada en `ScheduleDayViewScreen.clientLabel`
 * y `useMyActivity.load` — a propósito NO se refactorizan esos dos usos en
 * esta fase (ver Decisión 6 del plan de Dashboard Admin), para no reabrir
 * pantallas ya estables sin necesidad. Queda como limpieza técnica
 * pendiente, no bloqueante.
 */
export function resolveClientLabel(
  schedule: Pick<Schedule, "clientId" | "unregisteredClientName">,
  clientsById: ReadonlyMap<string, Client>,
): string {
  if (schedule.clientId) {
    const client = clientsById.get(schedule.clientId);
    return client
      ? `${client.firstName} ${client.lastName}`
      : "Cliente eliminado";
  }
  return schedule.unregisteredClientName ?? "Cliente";
}
