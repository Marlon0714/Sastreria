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
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largoManga: number | null;
  anchoManga: number | null;
  escote: number | null;
  cuello: number | null;
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
  pecho?: number | null;
  cintura?: number | null;
  base?: number | null;
  largo?: number | null;
  largoManga?: number | null;
  anchoManga?: number | null;
  escote?: number | null;
  cuello?: number | null;
  brazo?: number | null;
  puno?: number | null;
  changedBy?: string | null;
  notes?: string | null;
}

// ─── Medidas Pantalón ─────────────────────────────────────────────────────────

export interface PantalonMeasurement extends BaseEntity {
  clientId: string;
  largo: number | null;
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
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largoManga: number | null;
  anchoManga: number | null;
  escote: number | null;
  cuello: number | null;
  brazo: number | null;
  puno: number | null;
}

export interface UpsertSacoDTO {
  clientId: string;
  espalda?: number | null;
  hombro?: number | null;
  talleDelantero?: number | null;
  talleTrasero?: number | null;
  distancia?: number | null;
  separacion?: number | null;
  pecho?: number | null;
  cintura?: number | null;
  base?: number | null;
  largo?: number | null;
  largoManga?: number | null;
  anchoManga?: number | null;
  escote?: number | null;
  cuello?: number | null;
  brazo?: number | null;
  puno?: number | null;
}

// ─── Medidas Chaleco (N-045) ──────────────────────────────────────────────────

export interface ChalecoMeasurement extends BaseEntity {
  clientId: string;
  espalda: number | null;
  talleTrasero: number | null;
  largo: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  escote: number | null;
}

export interface UpsertChalecoDTO {
  clientId: string;
  espalda?: number | null;
  talleTrasero?: number | null;
  largo?: number | null;
  pecho?: number | null;
  cintura?: number | null;
  base?: number | null;
  escote?: number | null;
}

// ─── Tallas ───────────────────────────────────────────────────────────────────

export type TallaType = "camisa" | "pantalon" | "saco" | "chaleco";

export interface ClientTalla extends BaseEntity {
  clientId: string;
  type: TallaType;
  value: string;
  notes: string | null;
}

export interface CreateTallaDTO {
  clientId: string;
  type: TallaType;
  value: string;
  notes?: string;
}

export interface UpdateTallaDTO {
  id: string;
  clientId: string;
  type: TallaType;
  value: string;
  notes?: string;
}
