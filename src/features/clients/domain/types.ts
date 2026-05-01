import * as Crypto from "expo-crypto";

import type { BaseEntity } from "../../../shared/domain/baseEntity";

export interface Client extends BaseEntity {
  firstName: string;
  lastName: string;
  phone: string;
  notes: string | null;
  measurements: Array<CamisaMeasurement | PantalonMeasurement>;
}

export interface CreateClientDTO {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
}

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
