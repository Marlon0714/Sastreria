import {
  createClientsDependencies,
  resolveClientRepository as resolveClientRepositoryFromData,
  resolveMeasurementRepository as resolveMeasurementRepositoryFromData,
} from "../../../data/local/clientsDependencies";
import type {
  ClientRepository,
  ClientsDependencies,
  ClientsDependenciesOverrides,
  MeasurementRepository,
} from "../domain/repository";

export function resolveClientsDependencies(
  overrides: ClientsDependenciesOverrides = {},
): ClientsDependencies {
  return createClientsDependencies(overrides);
}

export function resolveClientRepository(
  repository?: ClientRepository,
): ClientRepository {
  return resolveClientRepositoryFromData(repository);
}

export function resolveMeasurementRepository(
  repository?: MeasurementRepository,
): MeasurementRepository {
  return resolveMeasurementRepositoryFromData(repository);
}
