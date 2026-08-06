import { getDatabase } from "./database";
import {
  notifyWriteCommitted,
  type WriteCommittedOptions,
} from "./writeCommitted";
import type { ScheduleEventRepository } from "../../features/schedule/domain/eventRepository";
import type {
  CreateScheduleEventDTO,
  ScheduleEvent,
  ScheduleEventAction,
} from "../../features/schedule/domain/events";
import { generateDomainUuid } from "../../features/clients/domain/types";

interface ScheduleEventRow {
  id: string;
  schedule_id: string;
  actor_id: string;
  actor_display_name: string;
  action: string;
  changes: string | null;
  identity_verified: number;
  created_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapRow(row: ScheduleEventRow): ScheduleEvent {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    action: row.action as ScheduleEventAction,
    changes: row.changes ?? undefined,
    identityVerified: row.identity_verified === 1,
    createdAt: row.created_at,
    updatedAt: row.created_at, // append-only: nunca se actualiza
    syncStatus: row.sync_status,
  };
}

export class ScheduleEventRepositoryImpl implements ScheduleEventRepository {
  constructor(private readonly options: WriteCommittedOptions = {}) {}

  async getByScheduleId(scheduleId: string): Promise<ScheduleEvent[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ScheduleEventRow>(
      "SELECT * FROM schedule_events WHERE schedule_id = ? ORDER BY created_at DESC",
      scheduleId,
    );
    return rows.map(mapRow);
  }

  async create(data: CreateScheduleEventDTO): Promise<ScheduleEvent> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const event: ScheduleEvent = {
      id: generateDomainUuid(),
      scheduleId: data.scheduleId,
      actorId: data.actorId,
      actorDisplayName: data.actorDisplayName,
      action: data.action,
      changes: data.changes,
      identityVerified: data.identityVerified,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `INSERT INTO schedule_events (id, schedule_id, actor_id, actor_display_name, action, changes, identity_verified, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      event.scheduleId,
      event.actorId,
      event.actorDisplayName,
      event.action,
      event.changes ?? null,
      event.identityVerified ? 1 : 0,
      event.createdAt,
      event.syncStatus,
    );
    notifyWriteCommitted(this.options);
    return event;
  }
}
