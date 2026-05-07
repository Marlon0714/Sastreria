import { getDatabase } from "./database";
import type { ScheduleRepository } from "../../features/schedule/domain/repository";
import type {
  Schedule,
  CreateScheduleDTO,
  UpdateScheduleDTO,
} from "../../features/schedule/domain/types";
import { generateDomainUuid } from "../../features/clients/domain/types";

interface ScheduleRow {
  id: string;
  date: string;
  time: string;
  client_id: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapRow(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    clientId: row.client_id,
    notes: row.notes ?? undefined,
    status: row.status as Schedule["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class ScheduleRepositoryImpl implements ScheduleRepository {
  async getAll(): Promise<Schedule[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules ORDER BY date DESC, time DESC",
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<Schedule | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<ScheduleRow>(
      "SELECT * FROM schedules WHERE id = ?",
      id,
    );
    return row ? mapRow(row) : null;
  }

  async getByDate(date: string): Promise<Schedule[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules WHERE date = ? ORDER BY time ASC",
      date,
    );
    return rows.map(mapRow);
  }

  async getByClient(clientId: string): Promise<Schedule[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules WHERE client_id = ? ORDER BY date DESC, time DESC",
      clientId,
    );
    return rows.map(mapRow);
  }

  async create(data: CreateScheduleDTO): Promise<Schedule> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const schedule: Schedule = {
      id: generateDomainUuid(),
      date: data.date,
      time: data.time,
      clientId: data.clientId,
      notes: data.notes,
      status: data.status,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `INSERT INTO schedules (id, date, time, client_id, notes, status, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      schedule.id,
      schedule.date,
      schedule.time,
      schedule.clientId,
      schedule.notes ?? null,
      schedule.status,
      schedule.createdAt,
      schedule.updatedAt,
      schedule.syncStatus,
    );
    return schedule;
  }

  async update(id: string, data: UpdateScheduleDTO): Promise<Schedule> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getById(id);
    if (!existing) throw new Error("Turno no encontrado");
    const updated: Schedule = {
      ...existing,
      ...data,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `UPDATE schedules SET date = ?, time = ?, client_id = ?, notes = ?, status = ?, updated_at = ?, sync_status = ? WHERE id = ?`,
      updated.date,
      updated.time,
      updated.clientId,
      updated.notes ?? null,
      updated.status,
      updated.updatedAt,
      updated.syncStatus,
      id,
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync("DELETE FROM schedules WHERE id = ?", id);
  }
}
