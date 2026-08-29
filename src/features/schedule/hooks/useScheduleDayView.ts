import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  // Guarda de cancelación (mismo patrón que useScheduleForm.ts,
  // ClientPickerField.tsx, OperarioPickerField.tsx y ScheduleHistoryList.tsx):
  // `load()` se reutiliza tanto desde el efecto de abajo como desde `reload()`
  // externo, así que en vez de un flag "cancelled" por efecto se usa un
  // token de la carga más reciente — si dos cargas quedan en vuelo (ej. doble
  // tap en "semana siguiente" o "Ir a hoy") y la más vieja resuelve después
  // de la más nueva, su respuesta ya no coincide con el token vigente y se
  // descarta en vez de sobreescribir el estado con datos de otra fecha.
  const latestRequestRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestRef.current;
    setError(null);
    setIsLoading(true);
    try {
      const [dateResults, pendingResults] = await Promise.all([
        repo.getByDate(date),
        repo.getWithoutDate(),
      ]);
      if (latestRequestRef.current !== requestId) {
        return;
      }
      setDateSchedules(dateResults);
      setPendingSchedules(pendingResults);
    } catch {
      if (latestRequestRef.current !== requestId) {
        return;
      }
      setError("No se pudo cargar la agenda.");
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [repo, date]);

  useEffect(() => {
    void load();
  }, [load]);

  return { dateSchedules, pendingSchedules, isLoading, error, reload: load };
}
