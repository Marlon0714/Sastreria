import { getDatabase } from "./database";
import type { TallaTemplateRepository } from "../../features/tallas/domain/repository";
import type {
  TallaTemplate,
  CreateTallaTemplateDTO,
  UpdateTallaTemplateDTO,
  TallaGarmentType,
} from "../../features/tallas/domain/types";
import { generateDomainUuid } from "../../features/clients/domain/types";
import {
  notifyWriteCommitted,
  type WriteCommittedOptions,
} from "./writeCommitted";

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
  pecho_ajustado: number | null;
  pecho_ancho: number | null;
  cintura: number | null;
  cintura_ajustado: number | null;
  cintura_ancho: number | null;
  base: number | null;
  base_ajustado: number | null;
  base_ancho: number | null;
  largo: number | null;
  manga_larga: number | null;
  manga_corta: number | null;
  escote: number | null;
  cuello_normal: number | null;
  cuello_cruce: number | null;
  brazo: number | null;
  puno: number | null;
  entrepierna: number | null;
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
    pechoAjustado: row.pecho_ajustado,
    pechoAncho: row.pecho_ancho,
    cintura: row.cintura,
    cinturaAjustado: row.cintura_ajustado,
    cinturaAncho: row.cintura_ancho,
    base: row.base,
    baseAjustado: row.base_ajustado,
    baseAncho: row.base_ancho,
    largo: row.largo,
    mangaLarga: row.manga_larga,
    mangaCorta: row.manga_corta,
    escote: row.escote,
    cuelloNormal: row.cuello_normal,
    cuelloCruce: row.cuello_cruce,
    brazo: row.brazo,
    puno: row.puno,
    entrepierna: row.entrepierna,
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
  constructor(private readonly options: WriteCommittedOptions = {}) {}

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
        pecho_ajustado, pecho_ancho, cintura, cintura_ajustado, cintura_ancho,
        base, base_ajustado, base_ancho, largo, manga_larga, manga_corta,
        escote, cuello_normal, cuello_cruce, brazo, puno, entrepierna, tiro, pierna, rodilla, bota,
        notes, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      dto.name,
      dto.type,
      n(dto.espalda),
      n(dto.hombro),
      n(dto.talleDelantero),
      n(dto.talleTrasero),
      n(dto.distancia),
      n(dto.separacion),
      n(dto.pechoAjustado),
      n(dto.pechoAncho),
      n(dto.cintura),
      n(dto.cinturaAjustado),
      n(dto.cinturaAncho),
      n(dto.base),
      n(dto.baseAjustado),
      n(dto.baseAncho),
      n(dto.largo),
      n(dto.mangaLarga),
      n(dto.mangaCorta),
      n(dto.escote),
      n(dto.cuelloNormal),
      n(dto.cuelloCruce),
      n(dto.brazo),
      n(dto.puno),
      n(dto.entrepierna),
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
    notifyWriteCommitted(this.options);
    return mapRow(row!);
  }

  async update(dto: UpdateTallaTemplateDTO): Promise<TallaTemplate> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE talla_templates SET
        name = COALESCE(?, name),
        espalda = ?, hombro = ?, talle_delantero = ?, talle_trasero = ?,
        distancia = ?, separacion = ?,
        pecho_ajustado = ?, pecho_ancho = ?,
        cintura = ?, cintura_ajustado = ?, cintura_ancho = ?,
        base = ?, base_ajustado = ?, base_ancho = ?,
        largo = ?, manga_larga = ?, manga_corta = ?, escote = ?,
        cuello_normal = ?, cuello_cruce = ?,
        brazo = ?, puno = ?, entrepierna = ?, tiro = ?, pierna = ?, rodilla = ?, bota = ?,
        notes = ?, updated_at = ?, sync_status = 'pending'
      WHERE id = ?;`,
      dto.name ?? null,
      n(dto.espalda),
      n(dto.hombro),
      n(dto.talleDelantero),
      n(dto.talleTrasero),
      n(dto.distancia),
      n(dto.separacion),
      n(dto.pechoAjustado),
      n(dto.pechoAncho),
      n(dto.cintura),
      n(dto.cinturaAjustado),
      n(dto.cinturaAncho),
      n(dto.base),
      n(dto.baseAjustado),
      n(dto.baseAncho),
      n(dto.largo),
      n(dto.mangaLarga),
      n(dto.mangaCorta),
      n(dto.escote),
      n(dto.cuelloNormal),
      n(dto.cuelloCruce),
      n(dto.brazo),
      n(dto.puno),
      n(dto.entrepierna),
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
    notifyWriteCommitted(this.options);
    return mapRow(row!);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const deleteLogId = generateDomainUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM talla_templates WHERE id = ?;`, id);
      await db.runAsync(
        `
        INSERT INTO sync_delete_log (id, entity_type, entity_id, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?);
        `,
        deleteLogId,
        "talla_template",
        id,
        nowIso,
        "pending",
      );
    });

    notifyWriteCommitted(this.options);
  }
}
