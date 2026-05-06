import { Schedule, CreateScheduleDTO, UpdateScheduleDTO } from "./types";

export interface ScheduleRepository {
  getAll(): Promise<Schedule[]>;
  getById(id: string): Promise<Schedule | null>;
  getByDate(date: string): Promise<Schedule[]>;
  getByClient(clientId: string): Promise<Schedule[]>;
  create(data: CreateScheduleDTO): Promise<Schedule>;
  update(id: string, data: UpdateScheduleDTO): Promise<Schedule>;
  delete(id: string): Promise<void>;
}
