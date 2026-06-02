import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { SacoMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseSacoMeasurementResult {
  measurement: SacoMeasurement | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UseSacoMeasurementDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useSacoMeasurement(
  clientId: string,
  dependencies: UseSacoMeasurementDependencies = {},
): UseSacoMeasurementResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [measurement, setMeasurement] = useState<SacoMeasurement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeasurement = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const item = await measurementRepository.findSacoByClientId(clientId);
      setMeasurement(item);
    } catch {
      setError("No se pudo cargar la medida de saco.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, measurementRepository]);

  useEffect(() => {
    void loadMeasurement();
  }, [loadMeasurement]);

  return { measurement, isLoading, error, reload: loadMeasurement };
}
