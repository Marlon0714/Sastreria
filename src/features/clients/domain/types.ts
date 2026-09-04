import * as Crypto from "expo-crypto";

import type { BaseEntity } from "../../../shared/domain/baseEntity";

// ─── Utilidad ────────────────────────────────────────────────────────────────

export function generateDomainUuid(): string {
  return Crypto.randomUUID();
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

export interface Client extends BaseEntity {
  firstName: string;
  lastName: string;
  phone: string;
  phones?: string[]; // hasta 3 teléfonos (N-045)
  cedula?: string; // opcional (N-045)
  notes: string | null;
  measurements: (CamisaMeasurement | PantalonMeasurement)[];
}

export interface CreateClientDTO {
  firstName: string;
  lastName: string;
  phone: string;
  phones?: string[];
  cedula?: string;
  notes?: string;
}

export interface UpdateClientDTO {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phones?: string[];
  cedula?: string;
  notes?: string;
}

// ─── Medidas Camisa ───────────────────────────────────────────────────────────

export interface CamisaMeasurement extends BaseEntity {
  clientId: string;
  espalda: number | null;
  hombro: number | null;
  talleDelantero: number | null;
  talleTrasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pechoAjustado: number | null;
  pechoAncho: number | null;
  cinturaAjustado: number | null;
  cinturaAncho: number | null;
  baseAjustado: number | null;
  baseAncho: number | null;
  largo: number | null;
  mangaLarga: number | null;
  mangaCorta: number | null;
  escote: number | null;
  cuelloNormal: number | null;
  cuelloCruce: number | null;
  brazo: number | null;
  puno: number | null;
  changedBy: string | null;
  changedAt: string | null;
  notes: string | null;
}

export interface UpsertCamisaDTO {
  clientId: string;
  espalda?: number | null;
  hombro?: number | null;
  talleDelantero?: number | null;
  talleTrasero?: number | null;
  distancia?: number | null;
  separacion?: number | null;
  pechoAjustado?: number | null;
  pechoAncho?: number | null;
  cinturaAjustado?: number | null;
  cinturaAncho?: number | null;
  baseAjustado?: number | null;
  baseAncho?: number | null;
  largo?: number | null;
  mangaLarga?: number | null;
  mangaCorta?: number | null;
  escote?: number | null;
  cuelloNormal?: number | null;
  cuelloCruce?: number | null;
  brazo?: number | null;
  puno?: number | null;
  changedBy?: string | null;
  notes?: string | null;
}

// ─── Medidas Pantalón ─────────────────────────────────────────────────────────

export interface PantalonMeasurement extends BaseEntity {
  clientId: string;
  largo: number | null;
  entrepierna: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  changedBy: string | null;
  changedAt: string | null;
  notes: string | null;
}

export interface UpsertPantalonDTO {
  clientId: string;
  largo?: number | null;
  entrepierna?: number | null;
  cintura?: number | null;
  base?: number | null;
  tiro?: number | null;
  pierna?: number | null;
  rodilla?: number | null;
  bota?: number | null;
  changedBy?: string | null;
  notes?: string | null;
}

// ─── Medidas Saco (N-045) ─────────────────────────────────────────────────────

export interface SacoMeasurement extends BaseEntity {
  clientId: string;
  espalda: number | null;
  hombro: number | null;
  talleDelantero: number | null;
  talleTrasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pechoAjustado: number | null;
  pechoAncho: number | null;
  cinturaAjustado: number | null;
  cinturaAncho: number | null;
  baseAjustado: number | null;
  baseAncho: number | null;
  largo: number | null;
  mangaLarga: number | null;
  mangaCorta: number | null;
  escote: number | null;
  cuelloNormal: number | null;
  cuelloCruce: number | null;
  brazo: number | null;
  puno: number | null;
  notes: string | null;
}

export interface UpsertSacoDTO {
  clientId: string;
  espalda?: number | null;
  hombro?: number | null;
  talleDelantero?: number | null;
  talleTrasero?: number | null;
  distancia?: number | null;
  separacion?: number | null;
  pechoAjustado?: number | null;
  pechoAncho?: number | null;
  cinturaAjustado?: number | null;
  cinturaAncho?: number | null;
  baseAjustado?: number | null;
  baseAncho?: number | null;
  largo?: number | null;
  mangaLarga?: number | null;
  mangaCorta?: number | null;
  escote?: number | null;
  cuelloNormal?: number | null;
  cuelloCruce?: number | null;
  brazo?: number | null;
  puno?: number | null;
  notes?: string | null;
}

// ─── Medidas Chaleco (N-045) ──────────────────────────────────────────────────

export interface ChalecoMeasurement extends BaseEntity {
  clientId: string;
  espalda: number | null;
  talleTrasero: number | null;
  largo: number | null;
  pechoAjustado: number | null;
  pechoAncho: number | null;
  cinturaAjustado: number | null;
  cinturaAncho: number | null;
  baseAjustado: number | null;
  baseAncho: number | null;
  escote: number | null;
  notes: string | null;
}

export interface UpsertChalecoDTO {
  clientId: string;
  espalda?: number | null;
  talleTrasero?: number | null;
  largo?: number | null;
  pechoAjustado?: number | null;
  pechoAncho?: number | null;
  cinturaAjustado?: number | null;
  cinturaAncho?: number | null;
  baseAjustado?: number | null;
  baseAncho?: number | null;
  escote?: number | null;
  notes?: string | null;
}
