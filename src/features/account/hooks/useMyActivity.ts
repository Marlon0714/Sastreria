import { useCallback, useEffect, useState } from "react";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import { localDateFromIso } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import { useIdentityStore } from "../../../shared/state/identityStore";

export interface MyActivityItem {
  schedule: Schedule;
  clientLabel: string;
}

interface UseMyActivityResult {
  items: MyActivityItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Completa el precio de un arreglo que quedó sin registrar. */
  addPrice: (scheduleId: string, price: number) => Promise<boolean>;
}

/**
 * Arreglos que ESTE operario marcó listo/entregado en `date` — sirve para
 * calcular su comisión (un % del precio de cada arreglo hecho ese día). Se
 * agrupa por el día en que se marcó listo (o entregado, si nunca pasó por
 * "listo"), no por la fecha en que se había agendado originalmente: ver
 * SUPABASE_MIGRATIONS.md / la conversación con el dueño (2026-08-16).
 */
export function useMyActivity(date: string): UseMyActivityResult {
  const ownProfileId = useIdentityStore(
    (state) => state.ownProfile?.id ?? null,
  );
  const clientRepository = useClientRepository();
  const [items, setItems] = useState<MyActivityItem[]>([]);
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
      const clientsById = new Map<string, Client>(
        clients.map((client) => [client.id, client]),
      );

      const done = schedules.filter((schedule) => {
        if (schedule.operarioId !== ownProfileId) return false;
        if (
          schedule.status !== "listo_para_entregar" &&
          schedule.status !== "entregado"
        ) {
          return false;
        }
        const completionTimestamp = schedule.readyAt ?? schedule.deliveredAt;
        if (!completionTimestamp) return false;
        return localDateFromIso(completionTimestamp) === date;
      });

      setItems(
        done.map((schedule) => {
          const client = schedule.clientId
            ? clientsById.get(schedule.clientId)
            : undefined;
          const clientLabel = schedule.clientId
            ? (client
                ? `${client.firstName} ${client.lastName}`
                : "Cliente eliminado")
            : (schedule.unregisteredClientName ?? "Cliente");
          return { schedule, clientLabel };
        }),
      );
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
  }, [ownProfileId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = items.reduce(
    (sum, item) => sum + (item.schedule.price ?? 0),
    0,
  );

  const addPrice = useCallback(
    async (scheduleId: string, price: number): Promise<boolean> => {
      try {
        await getDefaultScheduleRepository().update(scheduleId, { price });
        await load();
        return true;
      } catch {
        setError("No se pudo guardar el precio.");
        return false;
      }
    },
    [load],
  );

  return { items, total, isLoading, error, reload: load, addPrice };
}
