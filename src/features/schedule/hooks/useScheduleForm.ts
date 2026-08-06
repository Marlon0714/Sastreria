import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ResolvedIdentity } from "../../auth/hooks/useIdentityGate";
import { getDefaultScheduleEventRepository } from "../../../data/local/scheduleEventDependencies";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import { diffScheduleFields } from "../domain/changeDiff";
import type { CreateScheduleDTO, Schedule } from "../domain/types";

/**
 * Subconjunto de `useIdentityGate()` que necesita este hook — inyectado
 * desde la pantalla, que es dueña de la única instancia de `useIdentityGate`
 * por pantalla (y de los modales de PIN/selector offline).
 */
export interface ScheduleIdentityGate {
  requireIdentity: () => Promise<ResolvedIdentity | null>;
  releaseIdentity: () => void;
}

interface UseScheduleFormResult {
  schedule: Schedule | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submit: (values: CreateScheduleDTO) => Promise<Schedule | null>;
}

export function useScheduleForm(
  scheduleId: string | undefined,
  identityGate: ScheduleIdentityGate,
): UseScheduleFormResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const eventRepo = useMemo(() => getDefaultScheduleEventRepository(), []);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!scheduleId);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Lock síncrono (no depende de que React re-renderice) para que un doble
  // tap en "Guardar" no dispare dos envíos/eventos en paralelo.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!scheduleId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    repo
      .getById(scheduleId)
      .then((result) => {
        if (!cancelled) {
          setSchedule(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudo cargar el turno.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, scheduleId]);

  const submit = useCallback(
    async (values: CreateScheduleDTO): Promise<Schedule | null> => {
      if (isSubmittingRef.current) {
        return null;
      }
      isSubmittingRef.current = true;

      setError(null);
      setIsSubmitting(true);

      let identity = null;
      try {
        if (scheduleId && !schedule) {
          setError("Este turno ya no existe o no se pudo cargar.");
          return null;
        }

        identity = await identityGate.requireIdentity();
        if (!identity) {
          setError("No se pudo confirmar tu identidad. Intenta de nuevo.");
          return null;
        }

        if (scheduleId) {
          const before = schedule;
          const updated = await repo.update(scheduleId, values);

          if (before) {
            const fieldChanges = diffScheduleFields(before, updated);
            if (Object.keys(fieldChanges).length > 0) {
              await eventRepo.create({
                scheduleId: updated.id,
                actorId: identity.profile.id,
                actorDisplayName: identity.profile.displayName,
                action: "updated",
                changes: JSON.stringify(fieldChanges),
                identityVerified: identity.verified,
              });
            }

            if (before.status !== updated.status) {
              await eventRepo.create({
                scheduleId: updated.id,
                actorId: identity.profile.id,
                actorDisplayName: identity.profile.displayName,
                action: "status_auto",
                changes: JSON.stringify({
                  status: { before: before.status, after: updated.status },
                }),
                identityVerified: identity.verified,
              });
            }
          }

          return updated;
        }

        const created = await repo.create(values);
        const fieldChanges = diffScheduleFields({}, created);
        await eventRepo.create({
          scheduleId: created.id,
          actorId: identity.profile.id,
          actorDisplayName: identity.profile.displayName,
          action: "created",
          changes:
            Object.keys(fieldChanges).length > 0
              ? JSON.stringify(fieldChanges)
              : undefined,
          identityVerified: identity.verified,
        });
        return created;
      } catch {
        setError(
          scheduleId
            ? "No se pudo actualizar el turno. Intenta nuevamente."
            : "No se pudo guardar el turno. Intenta nuevamente.",
        );
        return null;
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    },
    [repo, eventRepo, scheduleId, schedule, identityGate],
  );

  return { schedule, isLoading, isSubmitting, error, submit };
}
