import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { Measurement } from "../domain/types";
import { useMeasurementRepository } from "./ClientsDependenciesProvider";

interface UseClientMeasurementHistoryResult {
  measurements: Measurement[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useClientMeasurementHistory(
  clientId: string,
  dependencies: Pick<
    ClientsDependenciesOverrides,
    "measurementRepository"
  > = {},
): UseClientMeasurementHistoryResult {
  const defaultMeasurementRepository = useMeasurementRepository();
  const measurementRepository = useMemo(
    () => dependencies.measurementRepository ?? defaultMeasurementRepository,
    [defaultMeasurementRepository, dependencies.measurementRepository],
  );
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const items =
        await measurementRepository.findMeasurementsByClientId(clientId);
      setMeasurements(items);
    } catch {
      setError("No se pudo cargar el historial de medidas.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, measurementRepository]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return {
    measurements,
    isLoading,
    error,
    reload: loadHistory,
  };
}
