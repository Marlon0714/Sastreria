import { getDatabase } from "./database";

import type { ClientRepository } from "../../features/clients/domain/repository";
import {
  generateDomainUuid,
  type Client,
  type CreateClientDTO,
} from "../../features/clients/domain/types";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
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
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    measurements: [],
  };
}

export class ClientRepositoryImpl implements ClientRepository {
  async create(input: CreateClientDTO): Promise<Client> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    const client: Client = {
      id: generateDomainUuid(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      notes: input.notes?.trim() ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: "pending",
      measurements: [],
    };

    await db.runAsync(
      `
      INSERT INTO clients (
        id,
        first_name,
        last_name,
        phone,
        notes,
        created_at,
        updated_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      client.id,
      client.firstName,
      client.lastName,
      client.phone,
      client.notes,
      client.createdAt,
      client.updatedAt,
      client.syncStatus,
    );

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
}
