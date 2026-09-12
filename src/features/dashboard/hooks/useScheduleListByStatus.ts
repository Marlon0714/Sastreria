import { useCallback, useEffect, useMemo, useState } from "react";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import { todayDateString, type DateRange } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import {
  buildScheduleListItems,
  resolveScheduleListForBucket,
  type ScheduleListBucket,
  type ScheduleListItem,
} from "../domain/scheduleListBucket";

export interface UseScheduleListByStatusResult {
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  items: ScheduleListItem[];
}

/**
 * Trae `allSchedules`/`clients` completos (mismo `Promise.all` que
 * `useDashboardStats.load`, sin snapshot compartido — ver Decisión 1 del
 * plan) y deriva la lista de turnos de un bucket puntual vía
 * `resolveScheduleListForBucket`/`buildScheduleListItems`. `startDate`/
 * `endDate` llegan como escalares por navegación (`undefined` para buckets
 * globales); se combinan acá en un `DateRange | null`.
 */
export function useScheduleListByStatus(
  bucket: ScheduleListBucket,
  startDate: string | undefined,
  endDate: string | undefined,
): UseScheduleListByStatusResult {
  const clientRepository = useClientRepository();
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [clientsById, setClientsById] = useState<Map<string, Client>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const scheduleRepository = getDefaultScheduleRepository();
      const [schedules, clients] = await Promise.all([
        scheduleRepository.getAll(),
        clientRepository.findAll(),
      ]);
      setAllSchedules(schedules);
      setClientsById(new Map(clients.map((client) => [client.id, client])));
    } catch {
      setError("No se pudo cargar la lista de turnos.");
    } finally {
      setIsLoading(false);
    }
    // clientRepository no entra en las deps a propósito: es un singleton
    // provisto una sola vez (ver App.tsx) que nunca cambia en producción —
    // mismo comentario que useDashboardStats.ts/useMyActivity.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const range: DateRange | null = useMemo(
    () => (startDate && endDate ? { startDate, endDate } : null),
    [startDate, endDate],
  );

  const items = useMemo(() => {
    const today = todayDateString();
    const schedules = resolveScheduleListForBucket(
      allSchedules,
      bucket,
      range,
      today,
    );
    return buildScheduleListItems(schedules, clientsById);
  }, [allSchedules, bucket, range, clientsById]);

  return {
    isLoading,
    error,
    reload: load,
    items,
  };
}
