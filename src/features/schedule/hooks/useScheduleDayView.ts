import { useCallback, useEffect, useMemo, useState } from "react";

import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { Schedule } from "../domain/types";

interface UseScheduleDayViewResult {
  dateSchedules: Schedule[];
  /** Turnos sin fecha asignada — no pertenecen a ningún día concreto. */
  pendingSchedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useScheduleDayView(date: string): UseScheduleDayViewResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const [dateSchedules, setDateSchedules] = useState<Schedule[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const [dateResults, pendingResults] = await Promise.all([
        repo.getByDate(date),
        repo.getWithoutDate(),
      ]);
      setDateSchedules(dateResults);
      setPendingSchedules(pendingResults);
    } catch {
      setError("No se pudo cargar la agenda.");
    } finally {
      setIsLoading(false);
    }
  }, [repo, date]);

  useEffect(() => {
    void load();
  }, [load]);

  return { dateSchedules, pendingSchedules, isLoading, error, reload: load };
}
