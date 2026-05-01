import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { PantalonMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UsePantalonMeasurementResult {
  measurement: PantalonMeasurement | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UsePantalonMeasurementDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function usePantalonMeasurement(
  clientId: string,
  dependencies: UsePantalonMeasurementDependencies = {},
): UsePantalonMeasurementResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [measurement, setMeasurement] = useState<PantalonMeasurement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeasurement = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await measurementRepository.findPantalonByClientId(clientId);
      setMeasurement(item);
    } catch {
      setError("No se pudo cargar la medida de pantalón.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, measurementRepository]);

  useEffect(() => {
    void loadMeasurement();
  }, [loadMeasurement]);

  return {
    measurement,
    isLoading,
    error,
    reload: loadMeasurement,
  };
}
