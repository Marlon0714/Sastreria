import type { Schedule, ScheduleStatus } from "./types";

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

/** Estados que solo son alcanzables (automática o manualmente) con un operario asignado. */
const OPERARIO_REQUIRED_STATUSES: readonly ScheduleStatus[] = [
  "en_proceso",
  "listo_para_entregar",
  "entregado",
];

// Copia local (no importada de la UI) para componer los mensajes de bloqueo
// de más abajo — el dominio no debe depender de un archivo de pantalla.
const MANUAL_CORRECTION_STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

type ManualCorrectionCurrentFields = Pick<
  Schedule,
  "date" | "operarioId" | "isPriority" | "readyAt" | "deliveredAt"
>;

type ManualCorrectionResolvedFields = Partial<
  Pick<Schedule, "date" | "operarioId" | "isPriority" | "readyAt" | "deliveredAt">
>;

/**
 * Determina si corregir manualmente hacia `targetStatus` dejaría el turno en
 * una combinación de campos que la vía automática nunca produce por sí sola
 * (ej. "agendado" sin fecha, "en_proceso" sin operario) — a diferencia de
 * "pendiente", que sí se puede sostener limpiando los campos sueltos sin
 * inventar ningún dato (ver `resolveManualCorrectionFields`).
 */
export function getManualCorrectionBlockReason(
  current: Pick<Schedule, "date" | "operarioId">,
  targetStatus: ScheduleStatus,
): string | null {
  if (targetStatus === "agendado" && !current.date) {
    return `Asigna una fecha antes de corregir el turno a "${MANUAL_CORRECTION_STATUS_LABELS.agendado}".`;
  }

  if (OPERARIO_REQUIRED_STATUSES.includes(targetStatus) && !current.operarioId) {
    return `Asigna un operario antes de corregir el turno a "${MANUAL_CORRECTION_STATUS_LABELS[targetStatus]}".`;
  }

  return null;
}

/**
 * Normaliza los campos que la vía automática nunca deja sueltos para
 * `targetStatus` (ver tabla en el plan schedule-manual-correction-validation).
 * Asume que `getManualCorrectionBlockReason` ya validó que la corrección es
 * sostenible — no repite esa validación acá.
 */
export function resolveManualCorrectionFields(
  current: ManualCorrectionCurrentFields,
  targetStatus: ScheduleStatus,
): ManualCorrectionResolvedFields {
  const now = new Date().toISOString();

  switch (targetStatus) {
    case "pendiente":
      return {
        date: undefined,
        operarioId: undefined,
        isPriority: false,
        readyAt: undefined,
        deliveredAt: undefined,
      };
    case "agendado":
      return {
        operarioId: undefined,
        readyAt: undefined,
        deliveredAt: undefined,
      };
    case "en_proceso":
      return {
        readyAt: undefined,
        deliveredAt: undefined,
      };
    case "listo_para_entregar":
      return {
        deliveredAt: undefined,
        readyAt: current.readyAt ?? now,
      };
    case "entregado":
      return {
        deliveredAt: current.deliveredAt ?? now,
      };
    default:
      return {};
  }
}

/**
 * Describe en español, solo los campos VISIBLES en el formulario que
 * `resolveManualCorrectionFields` va a limpiar (fecha/operario) — usado por
 * el diálogo de confirmación de la UI. Deliberadamente no incluye
 * `readyAt`/`deliveredAt`: son metadata interna sin campo propio en el
 * formulario.
 */
export function describeManualCorrectionSideEffects(
  current: ManualCorrectionCurrentFields,
  targetStatus: ScheduleStatus,
): string[] {
  const resolved = resolveManualCorrectionFields(current, targetStatus);
  const effects: string[] = [];

  if ("date" in resolved && current.date) {
    effects.push("la fecha");
  }
  if ("operarioId" in resolved && current.operarioId) {
    effects.push("el operario asignado");
  }

  return effects;
}
