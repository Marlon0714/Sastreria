import type { BaseEntity } from "../../../shared/domain/baseEntity";

export type ScheduleStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface Schedule extends BaseEntity {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  clientId: string;
  notes?: string;
  status: ScheduleStatus;
}

export interface CreateScheduleDTO {
  date: string;
  time: string;
  clientId: string;
  notes?: string;
  status: ScheduleStatus;
}

export interface UpdateScheduleDTO {
  date?: string;
  time?: string;
  clientId?: string;
  notes?: string;
  status?: ScheduleStatus;
}
