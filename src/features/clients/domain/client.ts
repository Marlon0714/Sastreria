// Tipos de dominio para cliente y medidas (N-045)
import type { BaseEntity } from "../../../shared/domain/baseEntity";

export interface Client extends BaseEntity {
  name: string;
  lastName: string;
  phones: string[]; // 1-3 teléfonos
  cedula?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CamisaMeasurement extends BaseEntity {
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  cuello?: number;
  brazo?: number;
  puno?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PantalonMeasurement extends BaseEntity {
  clientId: string;
  largo?: number;
  cintura?: number;
  base?: number;
  tiro?: number;
  pierna?: number;
  rodilla?: number;
  bota?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SacoMeasurement extends BaseEntity {
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChalecoMeasurement extends BaseEntity {
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  createdAt: string;
  updatedAt: string;
}
