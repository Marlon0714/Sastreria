import { useCallback, useEffect, useMemo, useState } from "react";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { DateRange } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import { useIdentityStore } from "../../../shared/state/identityStore";
import { usePeriodSelector } from "../../../shared/hooks/usePeriodSelector";
import type { PeriodMode } from "../../../shared/domain/periodRange";
import {
  buildMyActivityItems,
  sumActivityPrices,
  type MyActivityItem,
} from "../domain/myActivity";

export type { MyActivityItem } from "../domain/myActivity";

export interface UseMyActivityResult {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  anchorDate: string;
  periodLabel: string;
  range: DateRange | null;
  rangeError: string | null;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrentPeriod: () => void;
  canGoToCurrentPeriod: boolean;
  jumpToDate: (date: string) => void;
  customRangeStart: string | undefined;
  customRangeEnd: string | undefined;
  setCustomRangeStart: (date: string | undefined) => void;
  setCustomRangeEnd: (date: string | undefined) => void;
  items: MyActivityItem[];
  total: number;
  isLoading: boolean;
  /** Falla FATAL de carga (turnos) — dispara el ErrorView de pantalla completa. */
  error: string | null;
  /** Falla puntual de `addPrice` — se muestra en línea, junto a la fila que se está editando. */
  priceError: string | null;
  reload: () => Promise<void>;
  /** Completa el precio de un arreglo que quedó sin registrar. */
  addPrice: (scheduleId: string, price: number) => Promise<boolean>;
}

/**
 * Arreglos que ESTE operario marcó listo/entregado dentro del periodo
 * seleccionado (día/semana/mes/rango, ver `usePeriodSelector`) — sirve para
 * calcular su comisión (un % del precio de cada arreglo hecho en ese
 * periodo). Se agrupa por el día en que se marcó listo (o entregado, si
 * nunca pasó por "listo"), no por la fecha en que se había agendado
 * originalmente — ver comentario de `buildMyActivityItems` en
 * `domain/myActivity.ts`.
 *
 * Mismo patrón que `useDashboardStats`: trae `schedules`/`clients`
 * completos UNA vez y deriva todo lo demás en JS con `useMemo` al navegar
 * de periodo, sin volver a pegarle a la base de datos (ver Decisión 6 del
 * plan de N-102).
 */
export function useMyActivity(): UseMyActivityResult {
  const ownProfileId = useIdentityStore(
    (state) => state.ownProfile?.id ?? null,
  );
  const clientRepository = useClientRepository();
  // `weekDatesForBreakdown` es un detalle interno de `usePeriodSelector`
  // exclusivo del desglose semanal del Dashboard (ver Tarea 14 del plan de
  // N-102) — no forma parte del contrato público de este hook.
  const { weekDatesForBreakdown: _weekDatesForBreakdown, ...periodSelector } =
    usePeriodSelector("dia");
  const { range } = periodSelector;
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [clientsById, setClientsById] = useState<Map<string, Client>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

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
      setError("No se pudieron cargar tus arreglos.");
    } finally {
      setIsLoading(false);
    }
    // clientRepository no entra en las deps a propósito: es un singleton
    // provisto una sola vez (ver App.tsx) que nunca cambia en producción —
    // incluirlo reintroduciría el fetch en cada render si algún test lo
    // mockea devolviendo un objeto nuevo por llamada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // `range` es `null` en modo "rango" mientras falte elegir alguna fecha o
  // si el rango es inválido — en ambos casos no hay nada que mostrar
  // todavía (mismo criterio que `useDashboardStats`).
  const items = useMemo(
    () =>
      range
        ? buildMyActivityItems(
            allSchedules,
            clientsById,
            ownProfileId,
            range.startDate,
            range.endDate,
          )
        : [],
    [allSchedules, clientsById, ownProfileId, range],
  );

  const total = useMemo(() => sumActivityPrices(items), [items]);

  const addPrice = useCallback(
    async (scheduleId: string, price: number): Promise<boolean> => {
      setPriceError(null);
      // Único resguardo antes del repositorio: ScheduleRepositoryImpl.update()
      // no corre updateScheduleSchema (ver schedule/domain/schemas.ts), así
      // que sin esto un precio inválido pasaría directo a la base de datos.
      if (!Number.isInteger(price) || price < 0) {
        setPriceError("El precio debe ser un número entero no negativo.");
        return false;
      }
      try {
        await getDefaultScheduleRepository().update(scheduleId, { price });
        await load();
        return true;
      } catch {
        setPriceError("No se pudo guardar el precio.");
        return false;
      }
    },
    [load],
  );

  return {
    ...periodSelector,
    items,
    total,
    isLoading,
    error,
    priceError,
    reload: load,
    addPrice,
  };
}
