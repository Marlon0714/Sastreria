import type {
  Schedule,
  CreateScheduleDTO,
  UpdateScheduleDTO,
  ScheduleStatus,
} from "./types";

export interface ScheduleRepository {
  getAll(): Promise<Schedule[]>;
  getById(id: string): Promise<Schedule | null>;
  getByDate(date: string): Promise<Schedule[]>;
  getByClient(clientId: string): Promise<Schedule[]>;
  /** Turnos sin fecha asignada — la sección "Pendientes" de la vista día-por-día. */
  getWithoutDate(): Promise<Schedule[]>;
  create(data: CreateScheduleDTO): Promise<Schedule>;
  /** Recalcula el status automáticamente, salvo que ya esté en un estado pegajoso. */
  update(id: string, data: UpdateScheduleDTO): Promise<Schedule>;
  /** Fija status="listo_para_entregar" y readyAt=ahora. */
  markReady(id: string): Promise<Schedule>;
  /** Fija status="entregado" y deliveredAt=ahora — permitido desde cualquier estado previo. */
  markDelivered(id: string): Promise<Schedule>;
  /** Válvula de escape: fija status a lo que se elija, sin ninguna regla. */
  applyManualCorrection(id: string, newStatus: ScheduleStatus): Promise<Schedule>;
  delete(id: string): Promise<void>;
}
