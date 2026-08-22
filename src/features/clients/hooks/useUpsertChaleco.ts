import { useMemo, useState } from "react";
import type { FieldErrors } from "react-hook-form";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  type UpsertChalecoSchemaInput,
  type UpsertChalecoSchemaOutput,
  upsertChalecoSchema,
} from "../domain/schemas";
import type { ChalecoMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseUpsertChalecoResult {
  isSubmitting: boolean;
  error: string | null;
  upsertChaleco: (
    values: UpsertChalecoSchemaInput,
  ) => Promise<ChalecoMeasurement | null>;
  validate: (
    values: UpsertChalecoSchemaInput,
  ) => FieldErrors<UpsertChalecoSchemaInput>;
}

function mapValidationErrors(
  values: UpsertChalecoSchemaInput,
): FieldErrors<UpsertChalecoSchemaInput> {
  const parsed = upsertChalecoSchema.safeParse(values);

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
    talleTrasero: fieldErrors.talleTrasero?.[0]
      ? { type: "zod", message: fieldErrors.talleTrasero[0] }
      : undefined,
    largo: fieldErrors.largo?.[0]
      ? { type: "zod", message: fieldErrors.largo[0] }
      : undefined,
    pechoAjustado: fieldErrors.pechoAjustado?.[0]
      ? { type: "zod", message: fieldErrors.pechoAjustado[0] }
      : undefined,
    pechoAncho: fieldErrors.pechoAncho?.[0]
      ? { type: "zod", message: fieldErrors.pechoAncho[0] }
      : undefined,
    cinturaAjustado: fieldErrors.cinturaAjustado?.[0]
      ? { type: "zod", message: fieldErrors.cinturaAjustado[0] }
      : undefined,
    cinturaAncho: fieldErrors.cinturaAncho?.[0]
      ? { type: "zod", message: fieldErrors.cinturaAncho[0] }
      : undefined,
    baseAjustado: fieldErrors.baseAjustado?.[0]
      ? { type: "zod", message: fieldErrors.baseAjustado[0] }
      : undefined,
    baseAncho: fieldErrors.baseAncho?.[0]
      ? { type: "zod", message: fieldErrors.baseAncho[0] }
      : undefined,
    escote: fieldErrors.escote?.[0]
      ? { type: "zod", message: fieldErrors.escote[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

type UseUpsertChalecoDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useUpsertChaleco(
  dependencies: UseUpsertChalecoDependencies = {},
): UseUpsertChalecoResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upsertChaleco = async (
    values: UpsertChalecoSchemaInput,
  ): Promise<ChalecoMeasurement | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: UpsertChalecoSchemaOutput =
        upsertChalecoSchema.parse(values);
      return await measurementRepository.upsertChaleco(payload);
    } catch {
      setError("No se pudo guardar la medida de chaleco. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    upsertChaleco,
    validate: mapValidationErrors,
  };
}
