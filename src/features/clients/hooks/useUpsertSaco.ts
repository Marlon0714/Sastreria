import { useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  type UpsertSacoSchemaInput,
  type UpsertSacoSchemaOutput,
  upsertSacoSchema,
} from "../domain/schemas";
import type { SacoMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseUpsertSacoResult {
  isSubmitting: boolean;
  error: string | null;
  upsertSaco: (
    values: UpsertSacoSchemaInput,
  ) => Promise<SacoMeasurement | null>;
}

type UseUpsertSacoDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useUpsertSaco(
  dependencies: UseUpsertSacoDependencies = {},
): UseUpsertSacoResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upsertSaco = async (
    values: UpsertSacoSchemaInput,
  ): Promise<SacoMeasurement | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: UpsertSacoSchemaOutput = upsertSacoSchema.parse(values);
      return await measurementRepository.upsertSaco(payload);
    } catch {
      setError("No se pudo guardar la medida de saco. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, error, upsertSaco };
}
