import type { ScheduleStatus } from "./types";

/**
 * Estados manuales que nunca se recalculan automáticamente. Una vez ahí,
 * solo salen mediante markReady/markDelivered/applyManualCorrection.
 */
const STICKY_STATUSES: readonly ScheduleStatus[] = [
  "listo_para_entregar",
  "entregado",
];

export interface DerivableScheduleFields {
  date?: string;
  operarioId?: string;
}

/**
 * Deriva el estado a partir de los campos presentes: gana el campo más
 * avanzado (operario > fecha > nada). No requiere que estén todos juntos —
 * un operario asignado sin fecha ya pasa a "en_proceso".
 */
export function deriveScheduleStatus(
  fields: DerivableScheduleFields,
): ScheduleStatus {
  if (fields.operarioId) return "en_proceso";
  if (fields.date) return "agendado";
  return "pendiente";
}

export function isStickyStatus(status: ScheduleStatus): boolean {
  return STICKY_STATUSES.includes(status);
}
