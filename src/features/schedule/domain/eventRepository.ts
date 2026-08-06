import type { CreateScheduleEventDTO, ScheduleEvent } from "./events";

/**
 * Append-only: no expone update/delete a propósito. Un evento, una vez
 * creado, nunca cambia ni se borra (ni siquiera si el turno al que
 * pertenece se elimina — el historial sobrevive).
 */
export interface ScheduleEventRepository {
  getByScheduleId(scheduleId: string): Promise<ScheduleEvent[]>;
  create(data: CreateScheduleEventDTO): Promise<ScheduleEvent>;
}
