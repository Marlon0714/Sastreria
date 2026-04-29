import { useCallback, useEffect, useState } from "react";

import { MeasurementRepositoryImpl } from "../../../data/local/MeasurementRepositoryImpl";
import type { Measurement } from "../domain/types";

const measurementRepository = new MeasurementRepositoryImpl();

interface UseClientMeasurementHistoryResult {
  measurements: Measurement[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useClientMeasurementHistory(
  clientId: string,
): UseClientMeasurementHistoryResult {
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
  }, [clientId]);

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
