import type { Schedule, ScheduleStatus } from "./types";

/**
 * Estados que se consideran "sin terminar" para el aviso de N-126 — el
 * complemento de `STICKY_STATUSES` (`statusDerivation.ts`), pero definido
 * de forma explícita en vez de negar ese set: acá interesa la semántica de
 * "todavía queda trabajo/entrega pendiente", no la de "estado final que no
 * se re-deriva automáticamente".
 */
export const UNFINISHED_SCHEDULE_STATUSES: readonly ScheduleStatus[] = [
  "pendiente",
  "agendado",
  "en_proceso",
];

/**
 * Busca, entre los turnos de un mismo cliente (ya filtrados por
 * `clientId` vía `ScheduleRepository.getByClient`), otro turno que
 * todavía no esté terminado (`UNFINISHED_SCHEDULE_STATUSES`). Útil para
 * advertir antes de crear un turno nuevo para un cliente que ya tiene
 * trabajo pendiente. Se excluye `excludeId` para mantener el mismo
 * contrato que `findDuplicateScheduleByName`, aunque hoy la pantalla
 * siempre le pasa `undefined` (el chequeo solo corre al crear, nunca al
 * editar — ver Decisiones de Diseño del plan).
 *
 * No reordena `clientSchedules`: devuelve el primero que cumple el
 * filtro, tal cual llega la lista (que `getByClient` ya ordena por
 * `date DESC, time DESC`).
 */
export function findUnfinishedScheduleByClient(
  clientSchedules: readonly Schedule[],
  excludeId: string | undefined,
): Schedule | null {
  return (
    clientSchedules.find(
      (item) =>
        item.id !== excludeId &&
        UNFINISHED_SCHEDULE_STATUSES.includes(item.status),
    ) ?? null
  );
}
