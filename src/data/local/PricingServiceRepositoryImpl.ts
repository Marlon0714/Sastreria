import type { PricingServiceRepository } from "../../features/pricing/repository/PricingServiceRepository";
import type {
  PricingService,
  CreatePricingServiceInput,
} from "../../features/pricing/domain/pricingService";
import { generateDomainUuid } from "../../features/clients/domain/types";
import { getDatabase } from "./database";

interface PricingServiceRow {
  id: string;
  name: string;
  price: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sync_status: "pending" | "synced" | "error";
}

function mapRow(row: PricingServiceRow): PricingService {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.sync_status,
  };
}

export class PricingServiceRepositoryImpl implements PricingServiceRepository {
  async getAll(): Promise<PricingService[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<PricingServiceRow>(
      `SELECT id, name, price, notes, createdAt, updatedAt, sync_status FROM pricing_services ORDER BY name ASC;`,
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<PricingService | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<PricingServiceRow>(
      `SELECT id, name, price, notes, createdAt, updatedAt, sync_status FROM pricing_services WHERE id = ? LIMIT 1;`,
      id,
    );
    return row ? mapRow(row) : null;
  }

  async create(input: CreatePricingServiceInput): Promise<PricingService> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const entity: PricingService = {
      id: generateDomainUuid(),
      name: input.name.trim(),
      price: input.price,
      notes: input.notes?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `INSERT INTO pricing_services (id, name, price, notes, createdAt, updatedAt, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      entity.id,
      entity.name,
      entity.price,
      entity.notes ?? null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus,
    );
    return entity;
  }

  async update(
    id: string,
    input: Partial<CreatePricingServiceInput>,
  ): Promise<PricingService> {
    const db = getDatabase();
    const prev = await this.getById(id);
    if (!prev) throw new Error(`PricingService not found: ${id}`);

    const now = new Date().toISOString();
    const updated: PricingService = {
      ...prev,
      name: input.name !== undefined ? input.name.trim() : prev.name,
      price: input.price !== undefined ? input.price : prev.price,
      notes: input.notes !== undefined ? (input.notes?.trim() ?? null) : prev.notes,
      updatedAt: now,
      syncStatus: "pending",
    };

    await db.runAsync(
      `UPDATE pricing_services SET name = ?, price = ?, notes = ?, updatedAt = ?, sync_status = 'pending' WHERE id = ?;`,
      updated.name,
      updated.price,
      updated.notes ?? null,
      updated.updatedAt,
      id,
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM pricing_services WHERE id = ?;`, id);
  }
}
