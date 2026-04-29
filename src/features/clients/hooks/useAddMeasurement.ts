import { useState } from "react";
import type { FieldErrors } from "react-hook-form";

import { MeasurementRepositoryImpl } from "../../../data/local/MeasurementRepositoryImpl";
import {
  addMeasurementSchema,
  type AddMeasurementSchemaInput,
  type AddMeasurementSchemaOutput,
} from "../domain/schemas";
import type { Measurement } from "../domain/types";

const measurementRepository = new MeasurementRepositoryImpl();

interface UseAddMeasurementResult {
  isSubmitting: boolean;
  error: string | null;
  addMeasurement: (
    values: AddMeasurementSchemaInput,
  ) => Promise<Measurement | null>;
  validate: (
    values: AddMeasurementSchemaInput,
  ) => FieldErrors<AddMeasurementSchemaInput>;
}

function mapValidationErrors(
  values: AddMeasurementSchemaInput,
): FieldErrors<AddMeasurementSchemaInput> {
  const parsed = addMeasurementSchema.safeParse(values);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
    clientId: fieldErrors.clientId?.[0]
      ? { type: "zod", message: fieldErrors.clientId[0] }
      : undefined,
    measuredAt: fieldErrors.measuredAt?.[0]
      ? { type: "zod", message: fieldErrors.measuredAt[0] }
      : undefined,
    pechoCm: fieldErrors.pechoCm?.[0]
      ? { type: "zod", message: fieldErrors.pechoCm[0] }
      : undefined,
    cinturaCm: fieldErrors.cinturaCm?.[0]
      ? { type: "zod", message: fieldErrors.cinturaCm[0] }
      : undefined,
    caderaCm: fieldErrors.caderaCm?.[0]
      ? { type: "zod", message: fieldErrors.caderaCm[0] }
      : undefined,
    largoCm: fieldErrors.largoCm?.[0]
      ? { type: "zod", message: fieldErrors.largoCm[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

export function useAddMeasurement(): UseAddMeasurementResult {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addMeasurement = async (
    values: AddMeasurementSchemaInput,
  ): Promise<Measurement | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: AddMeasurementSchemaOutput =
        addMeasurementSchema.parse(values);
      const createdMeasurement =
        await measurementRepository.addMeasurement(payload);
      return createdMeasurement;
    } catch {
      setError("No se pudo guardar la medida. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    addMeasurement,
    validate: mapValidationErrors,
  };
}
