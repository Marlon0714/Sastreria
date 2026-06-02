import { useMemo, useState } from "react";

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

  return { isSubmitting, error, upsertChaleco };
}
