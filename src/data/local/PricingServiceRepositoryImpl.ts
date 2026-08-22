import type { PricingServiceRepository } from "../../features/pricing/domain/repository";
import type {
  PricingService,
  CreatePricingServiceInput,
  PricingCategory,
} from "../../features/pricing/domain/pricingService";
import { generateDomainUuid } from "../../features/clients/domain/types";
import { getDatabase } from "./database";
import {
  notifyWriteCommitted,
  type WriteCommittedOptions,
} from "./writeCommitted";

interface PricingServiceRow {
  id: string;
  name: string;
  price: number;
  category: PricingCategory;
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
    category: row.category ?? "arreglo",
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.sync_status,
  };
}

export class PricingServiceRepositoryImpl implements PricingServiceRepository {
  constructor(private readonly options: WriteCommittedOptions = {}) {}

  async getAll(): Promise<PricingService[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<PricingServiceRow>(
      `SELECT id, name, price, category, notes, createdAt, updatedAt, sync_status FROM pricing_services ORDER BY name ASC;`,
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<PricingService | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<PricingServiceRow>(
      `SELECT id, name, price, category, notes, createdAt, updatedAt, sync_status FROM pricing_services WHERE id = ? LIMIT 1;`,
      id,
    );
    return row ? mapRow(row) : null;
  }

  /**
   * El nombre del servicio debe ser único por taller (ver comentario de
   * dominio en pricingService.ts). Se compara normalizado (trim +
   * case-insensitive) para que "Dobladillo" y " dobladillo " cuenten como
   * el mismo servicio. `excludeId` se usa al actualizar, para no chocar
   * contra el propio registro que se está editando.
   */
  private async assertNameNotDuplicated(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const db = getDatabase();
    const normalized = name.trim();
    const existing = excludeId
      ? await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM pricing_services WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ? LIMIT 1;`,
          normalized,
          excludeId,
        )
      : await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM pricing_services WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1;`,
          normalized,
        );
    if (existing) {
      throw new Error("Ya existe un servicio con ese nombre.");
    }
  }

  async create(input: CreatePricingServiceInput): Promise<PricingService> {
    const db = getDatabase();
    await this.assertNameNotDuplicated(input.name);
    const now = new Date().toISOString();
    const entity: PricingService = {
      id: generateDomainUuid(),
      name: input.name.trim(),
      price: input.price,
      category: input.category,
      notes: input.notes?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.runAsync(
      `INSERT INTO pricing_services (id, name, price, category, notes, createdAt, updatedAt, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      entity.id,
      entity.name,
      entity.price,
      entity.category,
      entity.notes ?? null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus,
    );
    notifyWriteCommitted(this.options);
    return entity;
  }

  async update(
    id: string,
    input: Partial<CreatePricingServiceInput>,
  ): Promise<PricingService> {
    const db = getDatabase();
    const prev = await this.getById(id);
    if (!prev) throw new Error(`PricingService not found: ${id}`);

    if (input.name !== undefined) {
      await this.assertNameNotDuplicated(input.name, id);
    }

    const now = new Date().toISOString();
    const updated: PricingService = {
      ...prev,
      name: input.name !== undefined ? input.name.trim() : prev.name,
      price: input.price !== undefined ? input.price : prev.price,
      category: input.category !== undefined ? input.category : prev.category,
      notes:
        input.notes !== undefined ? (input.notes?.trim() ?? null) : prev.notes,
      updatedAt: now,
      syncStatus: "pending",
    };

    await db.runAsync(
      `UPDATE pricing_services SET name = ?, price = ?, category = ?, notes = ?, updatedAt = ?, sync_status = 'pending' WHERE id = ?;`,
      updated.name,
      updated.price,
      updated.category,
      updated.notes ?? null,
      updated.updatedAt,
      id,
    );
    notifyWriteCommitted(this.options);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const deleteLogId = generateDomainUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM pricing_services WHERE id = ?;`, id);
      await db.runAsync(
        `
        INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?);
        `,
        deleteLogId,
        "pricing_service",
        id,
        nowIso,
        "pending",
      );
    });

    notifyWriteCommitted(this.options);
  }
}
