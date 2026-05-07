import { useMemo, useState } from "react";
import type { FieldErrors } from "react-hook-form";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  type UpsertPantalonSchemaInput,
  type UpsertPantalonSchemaOutput,
  upsertPantalonSchema,
} from "../domain/schemas";
import type { PantalonMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseUpsertPantalonResult {
  isSubmitting: boolean;
  error: string | null;
  upsertPantalon: (
    values: UpsertPantalonSchemaInput,
  ) => Promise<PantalonMeasurement | null>;
  validate: (
    values: UpsertPantalonSchemaInput,
  ) => FieldErrors<UpsertPantalonSchemaInput>;
}

function mapValidationErrors(
  values: UpsertPantalonSchemaInput,
): FieldErrors<UpsertPantalonSchemaInput> {
  const parsed = upsertPantalonSchema.safeParse(values);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
    clientId: fieldErrors.clientId?.[0]
      ? { type: "zod", message: fieldErrors.clientId[0] }
      : undefined,
    largo: fieldErrors.largo?.[0]
      ? { type: "zod", message: fieldErrors.largo[0] }
      : undefined,
    cintura: fieldErrors.cintura?.[0]
      ? { type: "zod", message: fieldErrors.cintura[0] }
      : undefined,
    base: fieldErrors.base?.[0]
      ? { type: "zod", message: fieldErrors.base[0] }
      : undefined,
    tiro: fieldErrors.tiro?.[0]
      ? { type: "zod", message: fieldErrors.tiro[0] }
      : undefined,
    pierna: fieldErrors.pierna?.[0]
      ? { type: "zod", message: fieldErrors.pierna[0] }
      : undefined,
    rodilla: fieldErrors.rodilla?.[0]
      ? { type: "zod", message: fieldErrors.rodilla[0] }
      : undefined,
    bota: fieldErrors.bota?.[0]
      ? { type: "zod", message: fieldErrors.bota[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

type UseUpsertPantalonDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useUpsertPantalon(
  dependencies: UseUpsertPantalonDependencies = {},
): UseUpsertPantalonResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upsertPantalon = async (
    values: UpsertPantalonSchemaInput,
  ): Promise<PantalonMeasurement | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: UpsertPantalonSchemaOutput =
        upsertPantalonSchema.parse(values);
      return await measurementRepository.upsertPantalon(payload);
    } catch {
      setError("No se pudo guardar la medida de pantalón. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    upsertPantalon,
    validate: mapValidationErrors,
  };
}
