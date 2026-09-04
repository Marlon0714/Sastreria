import { getDatabase } from "./database";
import type { WriteCommittedOptions } from "./writeCommitted";

import {
  deleteCamisaQuery,
  findCamisaByClientId as findCamisaByClientIdQuery,
  upsertCamisaQuery,
} from "./measurements/camisaMeasurementQueries";
import {
  deleteChalecoQuery,
  findChalecoByClientId as findChalecoByClientIdQuery,
  upsertChalecoQuery,
} from "./measurements/chalecoMeasurementQueries";
import {
  deletePantalonQuery,
  findPantalonByClientId as findPantalonByClientIdQuery,
  upsertPantalonQuery,
} from "./measurements/pantalonMeasurementQueries";
import {
  deleteSacoQuery,
  findSacoByClientId as findSacoByClientIdQuery,
  upsertSacoQuery,
} from "./measurements/sacoMeasurementQueries";

import type { MeasurementRepository } from "../../features/clients/domain/repository";
import type {
  CamisaMeasurement,
  ChalecoMeasurement,
  PantalonMeasurement,
  SacoMeasurement,
  UpsertCamisaDTO,
  UpsertChalecoDTO,
  UpsertPantalonDTO,
  UpsertSacoDTO,
} from "../../features/clients/domain/types";

/**
 * Implementación local (SQLite) de `MeasurementRepository`. La lógica de
 * mapeo SQL de cada prenda vive en `./measurements/<prenda>MeasurementQueries.ts`
 * como funciones puras que reciben la conexión de DB; esta clase solo
 * delega, para mantener manejable el archivo por prenda.
 */
export class MeasurementRepositoryImpl implements MeasurementRepository {
  constructor(private readonly options: WriteCommittedOptions = {}) {}

  async upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement> {
    return upsertCamisaQuery(getDatabase(), input, this.options);
  }

  async upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement> {
    return upsertPantalonQuery(getDatabase(), input, this.options);
  }

  async upsertSaco(input: UpsertSacoDTO): Promise<SacoMeasurement> {
    return upsertSacoQuery(getDatabase(), input, this.options);
  }

  async upsertChaleco(input: UpsertChalecoDTO): Promise<ChalecoMeasurement> {
    return upsertChalecoQuery(getDatabase(), input, this.options);
  }

  async findCamisaByClientId(
    clientId: string,
  ): Promise<CamisaMeasurement | null> {
    return findCamisaByClientIdQuery(getDatabase(), clientId);
  }

  async findPantalonByClientId(
    clientId: string,
  ): Promise<PantalonMeasurement | null> {
    return findPantalonByClientIdQuery(getDatabase(), clientId);
  }

  async findSacoByClientId(clientId: string): Promise<SacoMeasurement | null> {
    return findSacoByClientIdQuery(getDatabase(), clientId);
  }

  async findChalecoByClientId(
    clientId: string,
  ): Promise<ChalecoMeasurement | null> {
    return findChalecoByClientIdQuery(getDatabase(), clientId);
  }

  async deleteCamisa(clientId: string): Promise<void> {
    return deleteCamisaQuery(getDatabase(), clientId, this.options);
  }

  async deletePantalon(clientId: string): Promise<void> {
    return deletePantalonQuery(getDatabase(), clientId, this.options);
  }

  async deleteSaco(clientId: string): Promise<void> {
    return deleteSacoQuery(getDatabase(), clientId, this.options);
  }

  async deleteChaleco(clientId: string): Promise<void> {
    return deleteChalecoQuery(getDatabase(), clientId, this.options);
  }
}
