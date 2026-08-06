import type { BaseEntity } from "../../../shared/domain/baseEntity";

export type ScheduleStatus =
  | "pendiente"
  | "agendado"
  | "en_proceso"
  | "listo_para_entregar"
  | "entregado";

export type ScheduleCategory = "arreglo" | "confeccion";

export const SCHEDULE_CATEGORIES: readonly ScheduleCategory[] = [
  "arreglo",
  "confeccion",
];

export const SCHEDULE_CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  arreglo: "Arreglo",
  confeccion: "Confección",
};

export interface Schedule extends BaseEntity {
  // Exactamente uno de clientId/unregisteredClientName debe estar presente
  // (o clientId puede quedar vacío si el cliente fue borrado — ver
  // ClientRepositoryImpl.delete(), el turno sobrevive con clientId=undefined).
  clientId?: string;
  unregisteredClientName?: string; // turno agendado sin registrar cliente
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority: boolean; // marca un turno ya agendado (con fecha) como más urgente que el resto del día
  category: ScheduleCategory;
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
  clientId?: string;
  unregisteredClientName?: string;
  date?: string;
  time?: string;
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority?: boolean;
  category?: ScheduleCategory;
}

export interface UpdateScheduleDTO {
  clientId?: string;
  unregisteredClientName?: string;
  date?: string;
  time?: string;
  price?: number;
  operarioId?: string;
  notes?: string;
  isPriority?: boolean;
  category?: ScheduleCategory;
}
