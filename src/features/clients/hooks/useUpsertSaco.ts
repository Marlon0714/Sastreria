import { useMemo, useState } from "react";
import type { FieldErrors } from "react-hook-form";

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
  validate: (
    values: UpsertSacoSchemaInput,
  ) => FieldErrors<UpsertSacoSchemaInput>;
}

function mapValidationErrors(
  values: UpsertSacoSchemaInput,
): FieldErrors<UpsertSacoSchemaInput> {
  const parsed = upsertSacoSchema.safeParse(values);

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
    largo: fieldErrors.largo?.[0]
      ? { type: "zod", message: fieldErrors.largo[0] }
      : undefined,
    mangaLarga: fieldErrors.mangaLarga?.[0]
      ? { type: "zod", message: fieldErrors.mangaLarga[0] }
      : undefined,
    mangaCorta: fieldErrors.mangaCorta?.[0]
      ? { type: "zod", message: fieldErrors.mangaCorta[0] }
      : undefined,
    escote: fieldErrors.escote?.[0]
      ? { type: "zod", message: fieldErrors.escote[0] }
      : undefined,
    cuelloNormal: fieldErrors.cuelloNormal?.[0]
      ? { type: "zod", message: fieldErrors.cuelloNormal[0] }
      : undefined,
    cuelloCruce: fieldErrors.cuelloCruce?.[0]
      ? { type: "zod", message: fieldErrors.cuelloCruce[0] }
      : undefined,
    brazo: fieldErrors.brazo?.[0]
      ? { type: "zod", message: fieldErrors.brazo[0] }
      : undefined,
    puno: fieldErrors.puno?.[0]
      ? { type: "zod", message: fieldErrors.puno[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
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

  return { isSubmitting, error, upsertSaco, validate: mapValidationErrors };
}
