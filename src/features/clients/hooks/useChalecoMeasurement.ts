import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { ChalecoMeasurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseChalecoMeasurementResult {
  measurement: ChalecoMeasurement | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UseChalecoMeasurementDependencies = Pick<
  ClientsDependenciesOverrides,
  "measurementRepository"
>;

export function useChalecoMeasurement(
  clientId: string,
  dependencies: UseChalecoMeasurementDependencies = {},
): UseChalecoMeasurementResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );

  const [measurement, setMeasurement] = useState<ChalecoMeasurement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeasurement = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const item = await measurementRepository.findChalecoByClientId(clientId);
      setMeasurement(item);
    } catch {
      setError("No se pudo cargar la medida de chaleco.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, measurementRepository]);

  useEffect(() => {
    void loadMeasurement();
  }, [loadMeasurement]);

  return { measurement, isLoading, error, reload: loadMeasurement };
}
