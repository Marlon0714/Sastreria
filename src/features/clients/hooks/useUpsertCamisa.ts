import { useMemo, useState } from "react";
import type { FieldErrors } from "react-hook-form";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  type UpsertCamisaSchemaInput,
  type UpsertCamisaSchemaOutput,
  upsertCamisaSchema,
} from "../domain/schemas";
import type { CamisaMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseUpsertCamisaResult {
  isSubmitting: boolean;
  error: string | null;
  upsertCamisa: (
    values: UpsertCamisaSchemaInput,
  ) => Promise<CamisaMeasurement | null>;
  validate: (
    values: UpsertCamisaSchemaInput,
  ) => FieldErrors<UpsertCamisaSchemaInput>;
}

function mapValidationErrors(
  values: UpsertCamisaSchemaInput,
): FieldErrors<UpsertCamisaSchemaInput> {
  const parsed = upsertCamisaSchema.safeParse(values);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
    clientId: fieldErrors.clientId?.[0]
      ? { type: "zod", message: fieldErrors.clientId[0] }
      : undefined,
    espalda: fieldErrors.espalda?.[0]
      ? { type: "zod", message: fieldErrors.espalda[0] }
      : undefined,
    hombro: fieldErrors.hombro?.[0]
      ? { type: "zod", message: fieldErrors.hombro[0] }
      : undefined,
    talleDelantero: fieldErrors.talleDelantero?.[0]
      ? { type: "zod", message: fieldErrors.talleDelantero[0] }
      : undefined,
    talleTrasero: fieldErrors.talleTrasero?.[0]
      ? { type: "zod", message: fieldErrors.talleTrasero[0] }
      : undefined,
    distancia: fieldErrors.distancia?.[0]
      ? { type: "zod", message: fieldErrors.distancia[0] }
      : undefined,
    separacion: fieldErrors.separacion?.[0]
      ? { type: "zod", message: fieldErrors.separacion[0] }
      : undefined,
    pecho: fieldErrors.pecho?.[0]
      ? { type: "zod", message: fieldErrors.pecho[0] }
      : undefined,
    cintura: fieldErrors.cintura?.[0]
      ? { type: "zod", message: fieldErrors.cintura[0] }
      : undefined,
    base: fieldErrors.base?.[0]
      ? { type: "zod", message: fieldErrors.base[0] }
      : undefined,
    largo: fieldErrors.largo?.[0]
      ? { type: "zod", message: fieldErrors.largo[0] }
      : undefined,
    largoManga: fieldErrors.largoManga?.[0]
      ? { type: "zod", message: fieldErrors.largoManga[0] }
      : undefined,
    anchoManga: fieldErrors.anchoManga?.[0]
      ? { type: "zod", message: fieldErrors.anchoManga[0] }
      : undefined,
    escote: fieldErrors.escote?.[0]
      ? { type: "zod", message: fieldErrors.escote[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

type UseUpsertCamisaDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useUpsertCamisa(
  dependencies: UseUpsertCamisaDependencies = {},
): UseUpsertCamisaResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upsertCamisa = async (
    values: UpsertCamisaSchemaInput,
  ): Promise<CamisaMeasurement | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: UpsertCamisaSchemaOutput =
        upsertCamisaSchema.parse(values);
      return await measurementRepository.upsertCamisa(payload);
    } catch {
      setError("No se pudo guardar la medida de camisa. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    upsertCamisa,
    validate: mapValidationErrors,
  };
}
