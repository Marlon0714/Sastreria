import * as Crypto from "expo-crypto";

import type { BaseEntity } from "../../../shared/domain/baseEntity";

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

export interface AddMeasurementDTO {
  clientId: string;
  measuredAt?: string;
  pechoCm: number;
  cinturaCm: number;
  caderaCm: number;
  largoCm: number;
  notes?: string;
}

export function generateDomainUuid(): string {
  return Crypto.randomUUID();
}
