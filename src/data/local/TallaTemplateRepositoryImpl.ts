import { getDatabase } from "./database";
import type { TallaTemplateRepository } from "../../features/tallas/domain/repository";
import type {
  TallaTemplate,
  CreateTallaTemplateDTO,
  UpdateTallaTemplateDTO,
  TallaGarmentType,
} from "../../features/tallas/domain/types";
import { generateDomainUuid } from "../../features/clients/domain/types";

type SyncStatus = "pending" | "synced" | "error";

interface TallaTemplateRow {
  id: string;
  name: string;
  type: TallaGarmentType;
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
  sync_status: SyncStatus;
}

function mapRow(row: TallaTemplateRow): TallaTemplate {
  return {
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
  };
}

function n(v: number | null | undefined): number | null {
  return v != null && !isNaN(v) ? v : null;
}

export class TallaTemplateRepositoryImpl implements TallaTemplateRepository {
  async findAll(): Promise<TallaTemplate[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<TallaTemplateRow>(
      `SELECT * FROM talla_templates ORDER BY type, name;`,
    );
    return rows.map(mapRow);
  }

  async findByType(type: TallaGarmentType): Promise<TallaTemplate[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<TallaTemplateRow>(
      `SELECT * FROM talla_templates WHERE type = ? ORDER BY name;`,
      type,
    );
    return rows.map(mapRow);
  }

  async create(dto: CreateTallaTemplateDTO): Promise<TallaTemplate> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateDomainUuid();
    await db.runAsync(
      `INSERT INTO talla_templates (
        id, name, type,
        espalda, hombro, talle_delantero, talle_trasero, distancia, separacion,
        pecho, cintura, base, largo, largo_manga, ancho_manga,
        escote, cuello, brazo, puno, tiro, pierna, rodilla, bota,
        notes, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      dto.name,
      dto.type,
      n(dto.espalda),
      n(dto.hombro),
      n(dto.talleDelantero),
      n(dto.talleTrasero),
      n(dto.distancia),
      n(dto.separacion),
      n(dto.pecho),
      n(dto.cintura),
      n(dto.base),
      n(dto.largo),
      n(dto.largoManga),
      n(dto.anchoManga),
      n(dto.escote),
      n(dto.cuello),
      n(dto.brazo),
      n(dto.puno),
      n(dto.tiro),
      n(dto.pierna),
      n(dto.rodilla),
      n(dto.bota),
      dto.notes ?? null,
      now,
      now,
      "pending",
    );
    const row = await db.getFirstAsync<TallaTemplateRow>(
      `SELECT * FROM talla_templates WHERE id = ?;`,
      id,
    );
    return mapRow(row!);
  }

  async update(dto: UpdateTallaTemplateDTO): Promise<TallaTemplate> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE talla_templates SET
        name = COALESCE(?, name),
        espalda = ?, hombro = ?, talle_delantero = ?, talle_trasero = ?,
        distancia = ?, separacion = ?, pecho = ?, cintura = ?, base = ?,
        largo = ?, largo_manga = ?, ancho_manga = ?, escote = ?, cuello = ?,
        brazo = ?, puno = ?, tiro = ?, pierna = ?, rodilla = ?, bota = ?,
        notes = ?, updated_at = ?, sync_status = 'pending'
      WHERE id = ?;`,
      dto.name ?? null,
      n(dto.espalda),
      n(dto.hombro),
      n(dto.talleDelantero),
      n(dto.talleTrasero),
      n(dto.distancia),
      n(dto.separacion),
      n(dto.pecho),
      n(dto.cintura),
      n(dto.base),
      n(dto.largo),
      n(dto.largoManga),
      n(dto.anchoManga),
      n(dto.escote),
      n(dto.cuello),
      n(dto.brazo),
      n(dto.puno),
      n(dto.tiro),
      n(dto.pierna),
      n(dto.rodilla),
      n(dto.bota),
      dto.notes ?? null,
      now,
      dto.id,
    );
    const row = await db.getFirstAsync<TallaTemplateRow>(
      `SELECT * FROM talla_templates WHERE id = ?;`,
      dto.id,
    );
    return mapRow(row!);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM talla_templates WHERE id = ?;`, id);
  }
}
