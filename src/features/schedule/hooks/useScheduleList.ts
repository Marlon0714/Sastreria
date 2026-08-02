import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { Schedule } from "../domain/types";

interface UseScheduleListResult {
  schedules: Schedule[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useScheduleList(): UseScheduleListResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);

  const loadSchedules = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);

    if (hasDataRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextSchedules = await repo.getAll();
      hasDataRef.current = nextSchedules.length > 0;
      setSchedules(nextSchedules);
    } catch {
      setError("No se pudo cargar la agenda.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      inFlightRef.current = false;
    }
  }, [repo]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  return {
    schedules,
    isLoading,
    isRefreshing,
    error,
    reload: loadSchedules,
  };
}
