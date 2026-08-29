import { normalizeText } from "../../../shared/utils/textSearch";
import type { Schedule } from "./types";

/**
 * Subconjunto de un turno del que se puede derivar el "nombre" a comparar
 * (el propio `Schedule`, o los valores todavía sin guardar del formulario).
 */
export interface NamedSchedule {
  clientId?: string;
  unregisteredClientName?: string;
}

/**
 * Resuelve el nombre completo a comparar de un turno: si tiene `clientId`,
 * el nombre completo del cliente registrado (nombre + apellido); si no, el
 * `unregisteredClientName`. Devuelve `undefined` si no se puede resolver
 * (ej. el cliente registrado ya no está disponible localmente).
 */
export type ScheduleNameResolver = (schedule: NamedSchedule) => string | undefined;

/**
 * Busca, entre los turnos ya agendados para una misma fecha, otro turno
 * agendado para la misma persona (mismo nombre, sin distinguir
 * mayúsculas/espacios — mismo criterio que `findDuplicateByName`). Útil
 * para advertir antes de guardar un turno duplicado por accidente (ej.
 * doble-tap, o agendar sin notar que ya había un turno ese día para esa
 * persona). Se excluye `excludeId` para no comparar un turno en edición
 * contra sí mismo.
 */
export function findDuplicateScheduleByName(
  schedulesOnDate: readonly Schedule[],
  candidateName: string,
  excludeId: string | undefined,
  resolveName: ScheduleNameResolver,
): Schedule | null {
  const normalizedTarget = normalizeText(candidateName);
  if (!normalizedTarget) {
    return null;
  }

  return (
    schedulesOnDate.find((item) => {
      if (item.id === excludeId) {
        return false;
      }
      const itemName = resolveName(item);
      return itemName ? normalizeText(itemName) === normalizedTarget : false;
    }) ?? null
  );
}
