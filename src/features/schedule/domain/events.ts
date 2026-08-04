import type { BaseEntity } from "../../../shared/domain/baseEntity";

/**
 * - "created"/"updated": guardado normal de campos (no status).
 * - "status_auto": transición automática por presencia de campos (deriveScheduleStatus).
 * - "status_manual": avance esperado del flujo ("marcar listo"/"marcar entregado").
 * - "status_manual_correction": reversión excepcional (ej. un paquete devuelto).
 * - "deleted": el turno fue eliminado.
 */
export type ScheduleEventAction =
  | "created"
  | "updated"
  | "status_auto"
  | "status_manual"
  | "status_manual_correction"
  | "deleted";

export interface ScheduleEvent extends BaseEntity {
  scheduleId: string;
  actorId: string;
  actorDisplayName: string; // snapshot al momento del evento, no join
  action: ScheduleEventAction;
  changes?: string; // JSON: { campo: { before, after } }
  /**
   * false cuando la identidad se resolvió sin PIN por falta de conexión en
   * un dispositivo compartido (ver useIdentityGate) — queda visible en el
   * historial como "sin verificar (offline)".
   */
  identityVerified: boolean;
}

export interface CreateScheduleEventDTO {
  scheduleId: string;
  actorId: string;
  actorDisplayName: string;
  action: ScheduleEventAction;
  changes?: string;
  identityVerified: boolean;
}
