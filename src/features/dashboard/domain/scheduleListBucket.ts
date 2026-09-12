import type { Client } from "../../clients/domain/types";
import { resolveClientLabel } from "../../schedule/domain/clientLabel";
import type { DateRange } from "../../schedule/domain/dateUtils";
import type { Schedule, ScheduleStatus } from "../../schedule/domain/types";
import {
  filterGlobalPending,
  filterNotRealizedInPeriod,
  filterSchedulesInRange,
} from "./periodBreakdown";

/**
 * Cada tarjeta tocable de la grilla "¿Cómo van los turnos...?" +
 * "Otros indicadores" del Dashboard mapea a uno de estos buckets. Calca el
 * universo de `periodStatusCounts`/`notRealizedInPeriod`/
 * `globalPendingCount` (`useDashboardStats.ts`), pero resolviendo la lista
 * de turnos detrás del número en vez del conteo.
 */
export type ScheduleListBucket =
  | "total"
  | ScheduleStatus
  | "no_realizado"
  | "sin_fecha_global";

/**
 * Mismo criterio de orden que `searchResults` en `ScheduleDayViewScreen`:
 * `date` asc y luego `time` asc. Solo se aplica a los buckets acotados a un
 * periodo (todos sus turnos ya tienen `date`, por construcción de
 * `filterSchedulesInRange`) — el bucket global no se ordena acá.
 */
function sortByDateTimeAsc(schedules: readonly Schedule[]): Schedule[] {
  return [...schedules].sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      (a.time ?? "").localeCompare(b.time ?? ""),
  );
}

/**
 * Lista de turnos detrás de un bucket de la grilla del Dashboard.
 *
 * `"sin_fecha_global"` y `"pendiente"` devuelven exactamente la misma
 * lista (`filterGlobalPending`, sin ordenar — se usa el orden ya devuelto
 * por `getAll()`), y no dependen de `range`: `periodStatusCounts.pendiente`
 * siempre da 0 por construcción (`deriveScheduleStatus` solo asigna
 * `"pendiente"` a turnos sin `date`, y `filterSchedulesInRange` exige
 * `date` — ver comentario en `periodBreakdown.ts`), así que la tarjeta
 * "Pendientes" del periodo abriría siempre una lista vacía si se filtrara
 * por period. En vez de eso, delega en el mismo universo útil que "Sin
 * fecha (global)" (todos los turnos sin fecha) — decisión pedida
 * explícitamente por el usuario al revisar el plan.
 *
 * El resto de buckets sí dependen de `range` (`null` → `[]`, no hay nada
 * que listar) y se ordenan cronológicamente.
 */
export function resolveScheduleListForBucket(
  allSchedules: readonly Schedule[],
  bucket: ScheduleListBucket,
  range: DateRange | null,
  today: string,
): Schedule[] {
  if (bucket === "sin_fecha_global" || bucket === "pendiente") {
    return filterGlobalPending(allSchedules);
  }
  if (!range) return [];
  const schedulesInPeriod = filterSchedulesInRange(
    allSchedules,
    range.startDate,
    range.endDate,
  );
  if (bucket === "total") {
    return sortByDateTimeAsc(schedulesInPeriod);
  }
  if (bucket === "no_realizado") {
    return sortByDateTimeAsc(
      filterNotRealizedInPeriod(schedulesInPeriod, today),
    );
  }
  return sortByDateTimeAsc(
    schedulesInPeriod.filter((schedule) => schedule.status === bucket),
  );
}

export interface ScheduleListItem {
  schedule: Schedule;
  clientLabel: string;
}

/**
 * Calco directo de `buildReminderItems` (`overdueSchedules.ts`), sin las
 * columnas propias de recordatorios (`daysWaiting`/`severity`): solo el
 * turno y la etiqueta de cliente ya resuelta, en el mismo orden recibido.
 */
export function buildScheduleListItems(
  schedules: readonly Schedule[],
  clientsById: ReadonlyMap<string, Client>,
): ScheduleListItem[] {
  return schedules.map((schedule) => ({
    schedule,
    clientLabel: resolveClientLabel(schedule, clientsById),
  }));
}
