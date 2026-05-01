import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { CamisaMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseCamisaMeasurementResult {
  measurement: CamisaMeasurement | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UseCamisaMeasurementDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useCamisaMeasurement(
  clientId: string,
  dependencies: UseCamisaMeasurementDependencies = {},
): UseCamisaMeasurementResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [measurement, setMeasurement] = useState<CamisaMeasurement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeasurement = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await measurementRepository.findCamisaByClientId(clientId);
      setMeasurement(item);
    } catch {
      setError("No se pudo cargar la medida de camisa.");
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
