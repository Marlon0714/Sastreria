import * as Crypto from "expo-crypto";

import type { BaseEntity } from "../../../shared/domain/baseEntity";

/**
 * @deprecated Use `CamisaMeasurement` or `PantalonMeasurement` instead.
 * Removed in N-019 once obsolete hooks/screens are deleted.
 */
export interface Measurement extends BaseEntity {
  clientId: string;
  measuredAt: string;
  pechoCm: number;
  cinturaCm: number;
  caderaCm: number;
  largoCm: number;
  notes: string | null;
}

export interface Client extends BaseEntity {
  firstName: string;
  lastName: string;
  phone: string;
  notes: string | null;
  measurements: Measurement[];
}

export interface CreateClientDTO {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
}

/**
 * @deprecated Use `UpsertCamisaDTO` or `UpsertPantalonDTO` instead.
 * Removed in N-019 once obsolete hooks/screens are deleted.
 */
export interface AddMeasurementDTO {
  clientId: string;
  measuredAt?: string;
  pechoCm: number;
  cinturaCm: number;
  caderaCm: number;
  largoCm: number;
  notes?: string;
}

/**
 * Medidas de camisa por cliente. Todas opcionales: el usuario puede registrar
 * una medida parcial o ninguna. Upsert por `clientId` (UNIQUE en SQLite v2).
 */
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
  notes: string | null;
}

/**
 * Medidas de pantalón por cliente. Todas opcionales. Upsert por `clientId`.
 */
export interface PantalonMeasurement extends BaseEntity {
  clientId: string;
  largo: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
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
  notes?: string | null;
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
  notes?: string | null;
}

export function generateDomainUuid(): string {
  return Crypto.randomUUID();
}
