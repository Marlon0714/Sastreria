import { useCallback, useMemo, useState } from "react";

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
}

export function useScheduleStatusActions(
  scheduleId: string,
  identityGate: ScheduleIdentityGate,
): UseScheduleStatusActionsResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const eventRepo = useMemo(() => getDefaultScheduleEventRepository(), []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAction = useCallback(
    async (
      action: ScheduleEventAction,
      perform: () => Promise<Schedule>,
    ): Promise<Schedule | null> => {
      setError(null);
      setIsProcessing(true);
      try {
        const existing = await repo.getById(scheduleId);
        const identity = await identityGate.requireIdentity();
        if (!identity) {
          setError("No se pudo confirmar tu identidad. Intenta de nuevo.");
          return null;
        }

        const updated = await perform();
        await eventRepo.create({
          scheduleId,
          actorId: identity.profile.id,
          actorDisplayName: identity.profile.displayName,
          action,
          changes: JSON.stringify({
            status: { before: existing?.status ?? null, after: updated.status },
          }),
          identityVerified: identity.verified,
        });
        identityGate.releaseIdentity();
        return updated;
      } catch {
        setError("No se pudo actualizar el turno. Intenta nuevamente.");
        return null;
      } finally {
        setIsProcessing(false);
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

  return { isProcessing, error, markReady, markDelivered, applyCorrection };
}
