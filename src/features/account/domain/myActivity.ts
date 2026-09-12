import type { Client } from "../../clients/domain/types";
import { resolveClientLabel } from "../../schedule/domain/clientLabel";
import { localDateFromIso } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";

export interface MyActivityItem {
  schedule: Schedule;
  clientLabel: string;
}

/**
 * Arreglos que ESTE operario (`ownProfileId`) marcó listo/entregado dentro
 * de `[startDate, endDate]` (inclusive, comparación lexicográfica de
 * strings `YYYY-MM-DD`) — sirve para calcular su comisión (un % del precio
 * de cada arreglo hecho en ese periodo). Se agrupa por el día en que se
 * marcó listo (`readyAt`), o entregado (`deliveredAt`) si nunca pasó por
 * "listo", NO por la fecha en que se había agendado originalmente: ver
 * SUPABASE_MIGRATIONS.md / la conversación con el dueño (2026-08-16) — este
 * eje de tiempo es independiente de `schedule.date` (Decisión 3 del plan de
 * N-102), por eso este módulo no reutiliza `filterSchedulesInRange` de
 * `dashboard/domain/periodBreakdown.ts`.
 */
export function buildMyActivityItems(
  schedules: readonly Schedule[],
  clientsById: ReadonlyMap<string, Client>,
  ownProfileId: string | null,
  startDate: string,
  endDate: string,
): MyActivityItem[] {
  const items: MyActivityItem[] = [];
  for (const schedule of schedules) {
    if (schedule.operarioId !== ownProfileId) continue;
    if (
      schedule.status !== "listo_para_entregar" &&
      schedule.status !== "entregado"
    ) {
      continue;
    }
    const completionTimestamp = schedule.readyAt ?? schedule.deliveredAt;
    if (!completionTimestamp) continue;
    const completionDate = localDateFromIso(completionTimestamp);
    if (completionDate < startDate || completionDate > endDate) continue;
    items.push({
      schedule,
      clientLabel: resolveClientLabel(schedule, clientsById),
    });
  }
  return items;
}

/** Suma bruta (`sum(price)`) de los arreglos de `items` — sin comisión ni % aplicado (ver Decisión 8 del plan de N-102). */
export function sumActivityPrices(items: readonly MyActivityItem[]): number {
  return items.reduce((sum, item) => sum + (item.schedule.price ?? 0), 0);
}
