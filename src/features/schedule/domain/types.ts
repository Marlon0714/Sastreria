import type { BaseEntity } from "../../../shared/domain/baseEntity";

export type ScheduleStatus =
  | "pendiente"
  | "agendado"
  | "en_proceso"
  | "listo_para_entregar"
  | "entregado";

export interface Schedule extends BaseEntity {
  clientId: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority: boolean; // marca un turno ya agendado (con fecha) como más urgente que el resto del día
  status: ScheduleStatus;
  // true tras una corrección manual (applyManualCorrection) — evita que el
  // siguiente update() re-derive el status automáticamente solo porque
  // sigue habiendo operario/fecha asignados. Se resetea únicamente al crear
  // un turno nuevo; no hay acción explícita para "desbloquearlo" todavía.
  statusLocked: boolean;
  readyAt?: string; // timestamp automático al marcar "listo_para_entregar"
  deliveredAt?: string; // timestamp automático al marcar "entregado"
}

export interface CreateScheduleDTO {
  clientId: string;
  date?: string;
  time?: string;
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority?: boolean;
}

export interface UpdateScheduleDTO {
  clientId?: string;
  date?: string;
  time?: string;
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority?: boolean;
}
