import { useCallback, useMemo, useRef, useState } from "react";

import { getDefaultScheduleEventRepository } from "../../../data/local/scheduleEventDependencies";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { Schedule, ScheduleStatus } from "../domain/types";
import type { ScheduleIdentityGate } from "./useScheduleForm";
import type { ScheduleEventAction } from "../domain/events";

interface UseScheduleStatusActionsResult {
  isProcessing: boolean;
  error: string | null;
  /** Fija status="listo_para_entregar" y readyAt=ahora. */
  markReady: () => Promise<Schedule | null>;
  /** Fija status="entregado" y deliveredAt=ahora, desde cualquier estado previo. */
  markDelivered: () => Promise<Schedule | null>;
  /** Válvula de escape para casos excepcionales — fija el status elegido sin ninguna regla. */
  applyCorrection: (newStatus: ScheduleStatus) => Promise<Schedule | null>;
  /**
   * Asigna (o quita, con `undefined`) el operario sin pasar por el
   * formulario completo — al igual que en el formulario, esto deriva
   * "en_proceso" automáticamente salvo que el estado ya esté bloqueado o
   * sea uno de los finales (`listo_para_entregar`/`entregado`).
   */
  assignOperario: (operarioId: string | undefined) => Promise<Schedule | null>;
}

export function useScheduleStatusActions(
  scheduleId: string,
  identityGate: ScheduleIdentityGate,
): UseScheduleStatusActionsResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const eventRepo = useMemo(() => getDefaultScheduleEventRepository(), []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lock síncrono (no depende de que React re-renderice) para que un doble
  // tap en "Marcar listo/entregado" o una corrección no dispare dos
  // mutaciones/eventos en paralelo.
  const isRunningRef = useRef(false);

  const runAction = useCallback(
    async (
      action: ScheduleEventAction,
      perform: () => Promise<Schedule>,
    ): Promise<Schedule | null> => {
      if (isRunningRef.current) {
        return null;
      }
      isRunningRef.current = true;

      setError(null);
      setIsProcessing(true);

      let identity = null;
      try {
        const existing = await repo.getById(scheduleId);
        identity = await identityGate.requireIdentity();
        if (!identity) {
          setError("No se pudo confirmar tu identidad. Intenta de nuevo.");
          return null;
        }

        const updated = await perform();

        // Solo hay algo que auditar si el estado realmente cambió — evita un
        // evento "status_auto" fantasma cuando assignOperario reasigna el
        // operario sin que eso mueva el estado (ej. ya estaba en_proceso).
        if (existing?.status !== updated.status) {
          try {
            await eventRepo.create({
              scheduleId,
              actorId: identity.profile.id,
              actorDisplayName: identity.profile.displayName,
              action,
              changes: JSON.stringify({
                status: {
                  before: existing?.status ?? null,
                  after: updated.status,
                },
              }),
              identityVerified: identity.verified,
            });
          } catch (err) {
            // La mutación YA se guardó — un fallo acá es solo del registro
            // de auditoría, no de la acción en sí. Reportarla como fallida
            // llevaría al usuario a reintentar sobre datos ya actualizados
            // (ej. reescribir readyAt con una hora más tardía).
            console.error(
              JSON.stringify({
                level: "error",
                service: "useScheduleStatusActions",
                message:
                  "No se pudo registrar el evento de auditoría tras una mutación exitosa",
                scheduleId,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }
        return updated;
      } catch {
        setError("No se pudo actualizar el turno. Intenta nuevamente.");
        return null;
      } finally {
        if (identity) {
          identityGate.releaseIdentity();
        }
        setIsProcessing(false);
        isRunningRef.current = false;
      }
    },
    [repo, eventRepo, scheduleId, identityGate],
  );

  const markReady = useCallback(
    () => runAction("status_manual", () => repo.markReady(scheduleId)),
    [runAction, repo, scheduleId],
  );

  const markDelivered = useCallback(
    () => runAction("status_manual", () => repo.markDelivered(scheduleId)),
    [runAction, repo, scheduleId],
  );

  const applyCorrection = useCallback(
    (newStatus: ScheduleStatus) =>
      runAction("status_manual_correction", () =>
        repo.applyManualCorrection(scheduleId, newStatus),
      ),
    [runAction, repo, scheduleId],
  );

  const assignOperario = useCallback(
    (operarioId: string | undefined) =>
      runAction("status_auto", () => repo.update(scheduleId, { operarioId })),
    [runAction, repo, scheduleId],
  );

  return {
    isProcessing,
    error,
    markReady,
    markDelivered,
    applyCorrection,
    assignOperario,
  };
}
