import { useMemo, useRef, useState } from "react";

import { getDefaultScheduleEventRepository } from "../../../data/local/scheduleEventDependencies";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { ScheduleIdentityGate } from "./useScheduleForm";

interface UseDeleteScheduleResult {
  isDeleting: boolean;
  error: string | null;
  deleteSchedule: (id: string) => Promise<boolean>;
}

export function useDeleteSchedule(
  identityGate: ScheduleIdentityGate,
): UseDeleteScheduleResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const eventRepo = useMemo(() => getDefaultScheduleEventRepository(), []);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Lock síncrono (no depende de que React re-renderice) para que un doble
  // tap no dispare dos borrados/eventos en paralelo.
  const isRunningRef = useRef(false);

  const deleteSchedule = async (id: string): Promise<boolean> => {
    if (isRunningRef.current) {
      return false;
    }
    isRunningRef.current = true;

    setError(null);
    setIsDeleting(true);

    let identity = null;
    try {
      const existing = await repo.getById(id);
      identity = await identityGate.requireIdentity();
      if (!identity) {
        setError("No se pudo confirmar tu identidad. Intenta de nuevo.");
        return false;
      }

      await repo.delete(id);
      await eventRepo.create({
        scheduleId: id,
        actorId: identity.profile.id,
        actorDisplayName: identity.profile.displayName,
        action: "deleted",
        changes: existing
          ? JSON.stringify({ status: { before: existing.status, after: null } })
          : undefined,
        identityVerified: identity.verified,
      });
      return true;
    } catch {
      setError("No se pudo eliminar el turno. Intenta nuevamente.");
      return false;
    } finally {
      setIsDeleting(false);
      isRunningRef.current = false;
    }
  };

  return { isDeleting, error, deleteSchedule };
}
