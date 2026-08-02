import { useCallback, useEffect, useMemo, useState } from "react";

import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { CreateScheduleDTO, Schedule } from "../domain/types";

interface UseScheduleFormResult {
  schedule: Schedule | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submit: (values: CreateScheduleDTO) => Promise<Schedule | null>;
}

export function useScheduleForm(scheduleId?: string): UseScheduleFormResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!scheduleId);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      setIsSubmitting(true);
      try {
        if (scheduleId) {
          return await repo.update(scheduleId, values);
        }
        return await repo.create(values);
      } catch {
        setError(
          scheduleId
            ? "No se pudo actualizar el turno. Intenta nuevamente."
            : "No se pudo guardar el turno. Intenta nuevamente.",
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repo, scheduleId],
  );

  return { schedule, isLoading, isSubmitting, error, submit };
}
