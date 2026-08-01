import { getDatabase } from "../local/database";

import type {
  SyncCamisaQueueItem,
  SyncChalecoQueueItem,
  SyncClientQueueItem,
  SyncClientTallaQueueItem,
  SyncDeleteQueueItem,
  SyncPantalonQueueItem,
  SyncPricingServiceQueueItem,
  SyncQueueItem,
  SyncSacoQueueItem,
  SyncTallaTemplateQueueItem,
} from "./types";

interface ClientQueueRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface CamisaQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largo_manga: number | null;
  ancho_manga: number | null;
  escote: number | null;
  cuello: number | null;
  brazo: number | null;
  puno: number | null;
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PantalonQueueRow {
  id: string;
  client_id: string;
  largo: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface TallaQueueRow {
  id: string;
  client_id: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
  value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PricingServiceQueueRow {
  id: string;
  name: string;
  price: number;
  category: "arreglo" | "confeccion";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sync_status: "pending" | "synced" | "error";
}

interface SacoQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largo_manga: number | null;
  ancho_manga: number | null;
  escote: number | null;
  cuello: number | null;
  brazo: number | null;
  puno: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface ChalecoQueueRow {
  id: string;
  client_id: string;
  espalda: number | null;
  talle_trasero: number | null;
  largo: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  escote: number | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface TallaTemplateQueueRow {
  id: string;
  name: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largo_manga: number | null;
  ancho_manga: number | null;
  escote: number | null;
  cuello: number | null;
  brazo: number | null;
  puno: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface DeleteQueueRow {
  id: string;
  entity_type:
    | "client"
    | "camisa_measurement"
    | "pantalon_measurement"
    | "client_talla";
  entity_id: string;
  deleted_at: string;
  sync_status: "pending" | "synced" | "error";
}

interface PendingCountRow {
  total: number;
}

function toClientQueueItem(row: ClientQueueRow): SyncClientQueueItem {
  return {
    entityType: "client",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
      measurements: [],
    },
  };
}

function toCamisaQueueItem(row: CamisaQueueRow): SyncCamisaQueueItem {
  return {
    entityType: "camisa_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pecho: row.pecho,
      cintura: row.cintura,
      base: row.base,
      largo: row.largo,
      largoManga: row.largo_manga,
      anchoManga: row.ancho_manga,
      escote: row.escote,
      cuello: row.cuello,
      brazo: row.brazo,
      puno: row.puno,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toPantalonQueueItem(row: PantalonQueueRow): SyncPantalonQueueItem {
  return {
    entityType: "pantalon_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      largo: row.largo,
      cintura: row.cintura,
      base: row.base,
      tiro: row.tiro,
      pierna: row.pierna,
      rodilla: row.rodilla,
      bota: row.bota,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toTallaQueueItem(row: TallaQueueRow): SyncClientTallaQueueItem {
  return {
    entityType: "client_talla",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      type: row.type,
      value: row.value,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toPricingServiceQueueItem(
  row: PricingServiceQueueRow,
): SyncPricingServiceQueueItem {
  return {
    entityType: "pricing_service",
    id: row.id,
    updatedAt: row.updatedAt,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.sync_status,
    },
  };
}

function toSacoQueueItem(row: SacoQueueRow): SyncSacoQueueItem {
  return {
    entityType: "saco_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pecho: row.pecho,
      cintura: row.cintura,
      base: row.base,
      largo: row.largo,
      largoManga: row.largo_manga,
      anchoManga: row.ancho_manga,
      escote: row.escote,
      cuello: row.cuello,
      brazo: row.brazo,
      puno: row.puno,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toChalecoQueueItem(row: ChalecoQueueRow): SyncChalecoQueueItem {
  return {
    entityType: "chaleco_measurement",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      clientId: row.client_id,
      espalda: row.espalda,
      talleTrasero: row.talle_trasero,
      largo: row.largo,
      pecho: row.pecho,
      cintura: row.cintura,
      base: row.base,
      escote: row.escote,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toTallaTemplateQueueItem(
  row: TallaTemplateQueueRow,
): SyncTallaTemplateQueueItem {
  return {
    entityType: "talla_template",
    id: row.id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    operationType: "upsert",
    payload: {
      id: row.id,
      name: row.name,
      type: row.type,
      espalda: row.espalda,
      hombro: row.hombro,
      talleDelantero: row.talle_delantero,
      talleTrasero: row.talle_trasero,
      distancia: row.distancia,
      separacion: row.separacion,
      pecho: row.pecho,
      cintura: row.cintura,
      base: row.base,
      largo: row.largo,
      largoManga: row.largo_manga,
      anchoManga: row.ancho_manga,
      escote: row.escote,
      cuello: row.cuello,
      brazo: row.brazo,
      puno: row.puno,
      tiro: row.tiro,
      pierna: row.pierna,
      rodilla: row.rodilla,
      bota: row.bota,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    },
  };
}

function toDeleteQueueItem(row: DeleteQueueRow): SyncDeleteQueueItem {
  return {
    entityType: "delete_log",
    id: row.id,
    updatedAt: row.deleted_at,
    syncStatus: row.sync_status,
    operationType: "delete",
    payload: {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      deletedAt: row.deleted_at,
      syncStatus: row.sync_status,
    },
  };
}

export interface SyncQueueRepositoryPort {
  getPendingItems(limit: number): Promise<SyncQueueItem[]>;
  hasPendingItems(): Promise<boolean>;
  markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void>;
  markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void>;
}

export class SyncQueueRepository implements SyncQueueRepositoryPort {
  async getPendingItems(limit: number): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const statuses = ["pending", "error"] as const;

    const clientRows = await db.getAllAsync<ClientQueueRow>(
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
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const camisaRows = await db.getAllAsync<CamisaQueueRow>(
      `
      SELECT
        id,
        client_id,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho,
        cintura,
        base,
        largo,
        largo_manga,
        ancho_manga,
        escote,
        cuello,
        brazo,
        puno,
        changed_by,
        changed_at,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM camisa_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const pantalonRows = await db.getAllAsync<PantalonQueueRow>(
      `
      SELECT
        id,
        client_id,
        largo,
        cintura,
        base,
        tiro,
        pierna,
        rodilla,
        bota,
        changed_by,
        changed_at,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM pantalon_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const tallaRows = await db.getAllAsync<TallaQueueRow>(
      `
      SELECT
        id,
        client_id,
        type,
        value,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM client_tallas
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const pricingRows = await db.getAllAsync<PricingServiceQueueRow>(
      `
      SELECT
        id,
        name,
        price,
        category,
        notes,
        createdAt,
        updatedAt,
        sync_status
      FROM pricing_services
      WHERE sync_status IN (?, ?)
      ORDER BY updatedAt ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const sacoRows = await db.getAllAsync<SacoQueueRow>(
      `
      SELECT
        id,
        client_id,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho,
        cintura,
        base,
        largo,
        largo_manga,
        ancho_manga,
        escote,
        cuello,
        brazo,
        puno,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM saco_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const chalecoRows = await db.getAllAsync<ChalecoQueueRow>(
      `
      SELECT
        id,
        client_id,
        espalda,
        talle_trasero,
        largo,
        pecho,
        cintura,
        base,
        escote,
        created_at,
        updated_at,
        sync_status
      FROM chaleco_measurements
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const tallaTemplateRows = await db.getAllAsync<TallaTemplateQueueRow>(
      `
      SELECT
        id,
        name,
        type,
        espalda,
        hombro,
        talle_delantero,
        talle_trasero,
        distancia,
        separacion,
        pecho,
        cintura,
        base,
        largo,
        largo_manga,
        ancho_manga,
        escote,
        cuello,
        brazo,
        puno,
        tiro,
        pierna,
        rodilla,
        bota,
        notes,
        created_at,
        updated_at,
        sync_status
      FROM talla_templates
      WHERE sync_status IN (?, ?)
      ORDER BY updated_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    const deleteRows = await db.getAllAsync<DeleteQueueRow>(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        deleted_at,
        sync_status
      FROM sync_delete_log
      WHERE sync_status IN (?, ?)
      ORDER BY deleted_at ASC
      LIMIT ?;
      `,
      statuses[0],
      statuses[1],
      limit,
    );

    return [
      ...clientRows.map(toClientQueueItem),
      ...camisaRows.map(toCamisaQueueItem),
      ...pantalonRows.map(toPantalonQueueItem),
      ...tallaRows.map(toTallaQueueItem),
      ...pricingRows.map(toPricingServiceQueueItem),
      ...sacoRows.map(toSacoQueueItem),
      ...chalecoRows.map(toChalecoQueueItem),
      ...tallaTemplateRows.map(toTallaTemplateQueueItem),
      ...deleteRows.map(toDeleteQueueItem),
    ]
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(0, limit);
  }

  async hasPendingItems(): Promise<boolean> {
    const db = getDatabase();

    const countQuery = async (tableName: string): Promise<number> => {
      const result = await db.getFirstAsync<PendingCountRow>(
        `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE sync_status IN (?, ?);
        `,
        "pending",
        "error",
      );

      return result?.total ?? 0;
    };

    const [
      clientsCount,
      camisaCount,
      pantalonCount,
      tallaCount,
      pricingCount,
      sacoCount,
      chalecoCount,
      tallaTemplateCount,
      deleteCount,
    ] = await Promise.all([
      countQuery("clients"),
      countQuery("camisa_measurements"),
      countQuery("pantalon_measurements"),
      countQuery("client_tallas"),
      countQuery("pricing_services"),
      countQuery("saco_measurements"),
      countQuery("chaleco_measurements"),
      countQuery("talla_templates"),
      countQuery("sync_delete_log"),
    ]);

    return (
      clientsCount +
        camisaCount +
        pantalonCount +
        tallaCount +
        pricingCount +
        sacoCount +
        chalecoCount +
        tallaTemplateCount +
        deleteCount >
      0
    );
  }

  async markAsSynced(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, "synced");
  }

  async markAsError(
    entityType: SyncQueueItem["entityType"],
    id: string,
  ): Promise<void> {
    await this.updateStatus(entityType, id, "error");
  }

  private async updateStatus(
    entityType: SyncQueueItem["entityType"],
    id: string,
    syncStatus: "synced" | "error",
  ): Promise<void> {
    const db = getDatabase();
    const tableMap: Record<SyncQueueItem["entityType"], string> = {
      client: "clients",
      camisa_measurement: "camisa_measurements",
      pantalon_measurement: "pantalon_measurements",
      client_talla: "client_tallas",
      pricing_service: "pricing_services",
      saco_measurement: "saco_measurements",
      chaleco_measurement: "chaleco_measurements",
      talla_template: "talla_templates",
      delete_log: "sync_delete_log",
    };
    const table = tableMap[entityType];

    if (entityType === "delete_log") {
      await db.runAsync(
        `
        UPDATE ${table}
        SET sync_status = ?
        WHERE id = ?;
        `,
        syncStatus,
        id,
      );
      return;
    }

    // Only update sync_status — never touch updated_at, which is the
    // conflict-resolution timestamp used by the sync engine. Mutating it
    // here would cause silent last-write-wins conflicts.
    await db.runAsync(
      `
      UPDATE ${table}
      SET sync_status = ?
      WHERE id = ?;
      `,
      syncStatus,
      id,
    );
  }
}
