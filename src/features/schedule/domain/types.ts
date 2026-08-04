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
  status: ScheduleStatus;
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
}

export interface UpdateScheduleDTO {
  clientId?: string;
  date?: string;
  time?: string;
  price?: number;
  operarioId?: string;
  notes?: string;
}
