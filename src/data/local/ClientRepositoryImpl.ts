import { getDatabase } from "./database";

import type { ClientRepository } from "../../features/clients/domain/repository";
import {
  generateDomainUuid,
  type Client,
  type CreateClientDTO,
  type UpdateClientDTO,
} from "../../features/clients/domain/types";

type WriteCommittedCallback = () => void | Promise<void>;

interface ClientRepositoryImplOptions {
  onWriteCommitted?: WriteCommittedCallback;
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phones: string | null; // JSON array de teléfonos adicionales
  cedula: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    phones: row.phones ? (JSON.parse(row.phones) as string[]) : undefined,
    cedula: row.cedula ?? undefined,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    measurements: [],
  };
}

export class ClientRepositoryImpl implements ClientRepository {
  constructor(private readonly options: ClientRepositoryImplOptions = {}) {}

  async create(input: CreateClientDTO): Promise<Client> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    const client: Client = {
      id: generateDomainUuid(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      phones: input.phones?.filter(Boolean),
      cedula: input.cedula?.trim() ?? undefined,
      notes: input.notes?.trim() ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: "pending",
      measurements: [],
    };

    const phonesJson =
      client.phones && client.phones.length > 0
        ? JSON.stringify(client.phones)
        : null;

    await db.runAsync(
      `
      INSERT INTO clients (
        id,
        first_name,
        last_name,
        phone,
        phones,
        cedula,
        notes,
        created_at,
        updated_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      client.id,
      client.firstName,
      client.lastName,
      client.phone,
      phonesJson,
      client.cedula ?? null,
      client.notes,
      client.createdAt,
      client.updatedAt,
      client.syncStatus,
    );

    this.notifyWriteCommitted();

    return client;
  }

  async findAll(): Promise<Client[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ClientRow>(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone,
        phones,
        cedula,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM clients
      ORDER BY updated_at DESC;
      `,
    );

    return rows.map(mapClientRow);
  }

  async findById(id: string): Promise<Client | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<ClientRow>(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone,
        phones,
        cedula,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM clients
      WHERE id = ?
      LIMIT 1;
      `,
      id,
    );

    if (!row) {
      return null;
    }

    return mapClientRow(row);
  }

  async update(input: UpdateClientDTO): Promise<Client> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    const phonesJson =
      input.phones && input.phones.filter(Boolean).length > 0
        ? JSON.stringify(input.phones.filter(Boolean))
        : null;

    await db.runAsync(
      `
      UPDATE clients
      SET first_name = ?,
          last_name  = ?,
          phone      = ?,
          phones     = ?,
          cedula     = ?,
          notes      = ?,
          updated_at = ?,
          sync_status = 'pending'
      WHERE id = ?;
      `,
      input.firstName.trim(),
      input.lastName.trim(),
      input.phone.trim(),
      phonesJson,
      input.cedula?.trim() ?? null,
      input.notes?.trim() ?? null,
      nowIso,
      input.id,
    );

    const row = await db.getFirstAsync<ClientRow>(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone,
        phones,
        cedula,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM clients
      WHERE id = ?
      LIMIT 1;
      `,
      input.id,
    );

    if (!row) {
      // SQLite UPDATE on a non-existent id is a no-op — return a constructed client.
      return {
        id: input.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
        phones: input.phones?.filter(Boolean),
        cedula: input.cedula?.trim() ?? undefined,
        notes: input.notes?.trim() ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
        syncStatus: "pending",
        measurements: [],
      };
    }

    this.notifyWriteCommitted();

    return mapClientRow(row);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const deleteLogId = generateDomainUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM camisa_measurements WHERE client_id = ?;`,
        id,
      );
      await db.runAsync(
        `DELETE FROM pantalon_measurements WHERE client_id = ?;`,
        id,
      );
      await db.runAsync(`DELETE FROM clients WHERE id = ?;`, id);
      await db.runAsync(
        `
        INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?);
        `,
        deleteLogId,
        "client",
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

    // Sync trigger must never block or fail local writes.
    void Promise.resolve(this.options.onWriteCommitted()).catch(
      () => undefined,
    );
  }
}
