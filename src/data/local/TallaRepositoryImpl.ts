import { getDatabase } from "./database";

import type { TallaRepository } from "../../features/clients/domain/repository";
import {
  generateDomainUuid,
  type ClientTalla,
  type CreateTallaDTO,
  type TallaType,
  type UpdateTallaDTO,
} from "../../features/clients/domain/types";

type WriteCommittedCallback = () => void | Promise<void>;

interface TallaRepositoryImplOptions {
  onWriteCommitted?: WriteCommittedCallback;
}

interface TallaRow {
  id: string;
  client_id: string;
  type: TallaType;
  value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapTallaRow(row: TallaRow): ClientTalla {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    value: row.value,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class TallaRepositoryImpl implements TallaRepository {
  constructor(private readonly options: TallaRepositoryImplOptions = {}) {}

  async upsert(input: CreateTallaDTO | UpdateTallaDTO): Promise<ClientTalla> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const id = "id" in input && input.id ? input.id : generateDomainUuid();

    await db.runAsync(
      `
      INSERT OR REPLACE INTO client_tallas
        (id, client_id, type, value, notes, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, COALESCE(
        (SELECT created_at FROM client_tallas WHERE client_id = ? AND type = ?),
        ?
      ), ?, 'pending');
      `,
      id,
      input.clientId,
      input.type,
      input.value.trim(),
      input.notes?.trim() ?? null,
      input.clientId,
      input.type,
      nowIso,
      nowIso,
    );

    this.notifyWriteCommitted();

    const rows = await db.getAllAsync<TallaRow>(
      `SELECT * FROM client_tallas WHERE id = ?;`,
      id,
    );
    const row = rows[0];
    if (!row) throw new Error("Failed to retrieve talla after upsert");
    return mapTallaRow(row);
  }

  async findByClientId(clientId: string): Promise<ClientTalla[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<TallaRow>(
      `SELECT * FROM client_tallas WHERE client_id = ? ORDER BY type ASC;`,
      clientId,
    );
    return rows.map(mapTallaRow);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const deleteLogId = generateDomainUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM client_tallas WHERE id = ?;`, id);
      await db.runAsync(
        `
        INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?);
        `,
        deleteLogId,
        "client_talla",
        id,
        nowIso,
        "pending",
      );
    });

    this.notifyWriteCommitted();
  }

  private notifyWriteCommitted(): void {
    if (!this.options.onWriteCommitted) {
      return;
    }
    void Promise.resolve(this.options.onWriteCommitted()).catch(
      () => undefined,
    );
  }
}
