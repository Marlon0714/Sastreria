import type { BaseEntity } from "../../../shared/domain/baseEntity";

export type TallaGarmentType = "camisa" | "pantalon" | "saco" | "chaleco";

export const TALLA_GARMENT_LABELS: Record<TallaGarmentType, string> = {
  camisa: "Camisa",
  pantalon: "Pantalón",
  saco: "Saco",
  chaleco: "Chaleco",
};

export const TALLA_GARMENT_EMOJIS: Record<TallaGarmentType, string> = {
  camisa: "👔",
  pantalon: "👖",
  saco: "🧥",
  chaleco: "🦺",
};

/** Plantilla de talla del catálogo global. */
export interface TallaTemplate extends BaseEntity {
  name: string;
  type: TallaGarmentType;
  // Camisa / Saco
  espalda: number | null;
  hombro: number | null;
  talleDelantero: number | null;
  talleTrasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pechoAjustado: number | null;
  pechoAncho: number | null;
  cintura: number | null;
  cinturaAjustado: number | null;
  cinturaAncho: number | null;
  base: number | null;
  baseAjustado: number | null;
  baseAncho: number | null;
  largo: number | null;
  largoManga: number | null;
  anchoManga: number | null;
  escote: number | null;
  cuelloNormal: number | null;
  cuelloCruce: number | null;
  brazo: number | null;
  puno: number | null;
  // Pantalón
  entrepierna: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
}

export interface CreateTallaTemplateDTO {
  name: string;
  type: TallaGarmentType;
  espalda?: number | null;
  hombro?: number | null;
  talleDelantero?: number | null;
  talleTrasero?: number | null;
  distancia?: number | null;
  separacion?: number | null;
  pechoAjustado?: number | null;
  pechoAncho?: number | null;
  cintura?: number | null;
  cinturaAjustado?: number | null;
  cinturaAncho?: number | null;
  base?: number | null;
  baseAjustado?: number | null;
  baseAncho?: number | null;
  largo?: number | null;
  largoManga?: number | null;
  anchoManga?: number | null;
  escote?: number | null;
  cuelloNormal?: number | null;
  cuelloCruce?: number | null;
  brazo?: number | null;
  puno?: number | null;
  entrepierna?: number | null;
  tiro?: number | null;
  pierna?: number | null;
  rodilla?: number | null;
  bota?: number | null;
  notes?: string | null;
}

export interface UpdateTallaTemplateDTO extends Partial<CreateTallaTemplateDTO> {
  id: string;
}
