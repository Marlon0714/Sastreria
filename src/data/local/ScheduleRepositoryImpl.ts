import { getDatabase } from "./database";
import {
  notifyWriteCommitted,
  type WriteCommittedOptions,
} from "./writeCommitted";
import type { ScheduleRepository } from "../../features/schedule/domain/repository";
import {
  deriveScheduleStatus,
  isStickyStatus,
} from "../../features/schedule/domain/statusDerivation";
import type {
  Schedule,
  ScheduleStatus,
  CreateScheduleDTO,
  UpdateScheduleDTO,
} from "../../features/schedule/domain/types";
import { generateDomainUuid } from "../../features/clients/domain/types";

interface ScheduleRow {
  id: string;
  client_id: string;
  date: string | null;
  time: string | null;
  price: number | null;
  operario_id: string | null;
  notes: string | null;
  is_priority: number;
  status: string;
  status_locked: number;
  ready_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapRow(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    clientId: row.client_id,
    date: row.date ?? undefined,
    time: row.time ?? undefined,
    price: row.price ?? undefined,
    operarioId: row.operario_id ?? undefined,
    notes: row.notes ?? undefined,
    isPriority: row.is_priority === 1,
    status: row.status as ScheduleStatus,
    statusLocked: row.status_locked === 1,
    readyAt: row.ready_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class ScheduleRepositoryImpl implements ScheduleRepository {
  constructor(private readonly options: WriteCommittedOptions = {}) {}

  async getAll(): Promise<Schedule[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules ORDER BY date ASC, time ASC",
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

  async getWithoutDate(): Promise<Schedule[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules WHERE date IS NULL ORDER BY is_priority DESC, created_at ASC",
    );
    return rows.map(mapRow);
  }

  async create(data: CreateScheduleDTO): Promise<Schedule> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const schedule: Schedule = {
      id: generateDomainUuid(),
      clientId: data.clientId,
      date: data.date,
      time: data.time,
      price: data.price,
      operarioId: data.operarioId,
      notes: data.notes,
      isPriority: data.isPriority ?? false,
      status: deriveScheduleStatus(data),
      statusLocked: false,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `INSERT INTO schedules (id, client_id, date, time, price, operario_id, notes, is_priority, status, status_locked, ready_at, delivered_at, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      schedule.id,
      schedule.clientId,
      schedule.date ?? null,
      schedule.time ?? null,
      schedule.price ?? null,
      schedule.operarioId ?? null,
      schedule.notes ?? null,
      schedule.isPriority ? 1 : 0,
      schedule.status,
      schedule.statusLocked ? 1 : 0,
      schedule.readyAt ?? null,
      schedule.deliveredAt ?? null,
      schedule.createdAt,
      schedule.updatedAt,
      schedule.syncStatus,
    );
    notifyWriteCommitted(this.options);
    return schedule;
  }

  async update(id: string, data: UpdateScheduleDTO): Promise<Schedule> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Turno no encontrado");

    const merged = { ...existing, ...data };
    const status =
      existing.statusLocked || isStickyStatus(existing.status)
        ? existing.status
        : deriveScheduleStatus(merged);

    return this.persistUpdate({ ...merged, status });
  }

  async markReady(id: string): Promise<Schedule> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Turno no encontrado");

    return this.persistUpdate({
      ...existing,
      status: "listo_para_entregar",
      readyAt: new Date().toISOString(),
    });
  }

  async markDelivered(id: string): Promise<Schedule> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Turno no encontrado");

    return this.persistUpdate({
      ...existing,
      status: "entregado",
      deliveredAt: new Date().toISOString(),
    });
  }

  async applyManualCorrection(
    id: string,
    newStatus: ScheduleStatus,
  ): Promise<Schedule> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Turno no encontrado");

    // Queda "bloqueado": una corrección manual es una excepción deliberada,
    // no debe perderse en el siguiente update() de un campo cualquiera solo
    // porque la derivación automática (ej. operario asignado) diga otra cosa.
    return this.persistUpdate({
      ...existing,
      status: newStatus,
      statusLocked: true,
    });
  }

  private async persistUpdate(
    next: Omit<Schedule, "updatedAt" | "syncStatus">,
  ): Promise<Schedule> {
    const db = getDatabase();
    const updated: Schedule = {
      ...next,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };

    await db.runAsync(
      `UPDATE schedules SET client_id = ?, date = ?, time = ?, price = ?, operario_id = ?, notes = ?, is_priority = ?, status = ?, status_locked = ?, ready_at = ?, delivered_at = ?, updated_at = ?, sync_status = ? WHERE id = ?`,
      updated.clientId,
      updated.date ?? null,
      updated.time ?? null,
      updated.price ?? null,
      updated.operarioId ?? null,
      updated.notes ?? null,
      updated.isPriority ? 1 : 0,
      updated.status,
      updated.statusLocked ? 1 : 0,
      updated.readyAt ?? null,
      updated.deliveredAt ?? null,
      updated.updatedAt,
      updated.syncStatus,
      updated.id,
    );
    notifyWriteCommitted(this.options);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const deleteLogId = generateDomainUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM schedules WHERE id = ?", id);
      await db.runAsync(
        `
        INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?);
        `,
        deleteLogId,
        "schedule",
        id,
        nowIso,
        "pending",
      );
    });

    notifyWriteCommitted(this.options);
  }
}
