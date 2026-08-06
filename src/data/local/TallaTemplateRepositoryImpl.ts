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

/**
 * A diferencia de `n()`, distingue "no vino en el DTO" (mantener el valor
 * actual — update() es un contrato de actualización PARCIAL) de "vino como
 * null/undefined explícito en un campo numérico ya presente" (limpiarlo).
 */
function mergeNum(
  value: number | null | undefined,
  current: number | null,
): number | null {
  return value === undefined ? current : n(value);
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
    const existing = await db.getFirstAsync<TallaTemplateRow>(
      `SELECT * FROM talla_templates WHERE id = ?;`,
      dto.id,
    );
    if (!existing) {
      throw new Error("Plantilla de talla no encontrada");
    }
    const now = new Date().toISOString();

    // update() es un contrato PARCIAL (UpdateTallaTemplateDTO extiende
    // Partial<CreateTallaTemplateDTO>) — un campo omitido debe conservar su
    // valor actual, no borrarse. Antes cada campo (salvo `name`, que sí
    // usaba COALESCE) se sobreescribía siempre con `n(dto.campo)`, que
    // convierte `undefined` en `NULL` — cualquier update parcial real
    // (ej. renombrar la plantilla sin reenviar las 27 medidas) borraba
    // todas las medidas existentes.
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
      mergeNum(dto.espalda, existing.espalda),
      mergeNum(dto.hombro, existing.hombro),
      mergeNum(dto.talleDelantero, existing.talle_delantero),
      mergeNum(dto.talleTrasero, existing.talle_trasero),
      mergeNum(dto.distancia, existing.distancia),
      mergeNum(dto.separacion, existing.separacion),
      mergeNum(dto.pechoAjustado, existing.pecho_ajustado),
      mergeNum(dto.pechoAncho, existing.pecho_ancho),
      mergeNum(dto.cintura, existing.cintura),
      mergeNum(dto.cinturaAjustado, existing.cintura_ajustado),
      mergeNum(dto.cinturaAncho, existing.cintura_ancho),
      mergeNum(dto.base, existing.base),
      mergeNum(dto.baseAjustado, existing.base_ajustado),
      mergeNum(dto.baseAncho, existing.base_ancho),
      mergeNum(dto.largo, existing.largo),
      mergeNum(dto.mangaLarga, existing.manga_larga),
      mergeNum(dto.mangaCorta, existing.manga_corta),
      mergeNum(dto.escote, existing.escote),
      mergeNum(dto.cuelloNormal, existing.cuello_normal),
      mergeNum(dto.cuelloCruce, existing.cuello_cruce),
      mergeNum(dto.brazo, existing.brazo),
      mergeNum(dto.puno, existing.puno),
      mergeNum(dto.entrepierna, existing.entrepierna),
      mergeNum(dto.tiro, existing.tiro),
      mergeNum(dto.pierna, existing.pierna),
      mergeNum(dto.rodilla, existing.rodilla),
      mergeNum(dto.bota, existing.bota),
      dto.notes !== undefined ? dto.notes : existing.notes,
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
