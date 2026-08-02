import { useMemo, useState } from "react";

import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";

interface UseDeleteScheduleResult {
  isDeleting: boolean;
  error: string | null;
  deleteSchedule: (id: string) => Promise<boolean>;
}

export function useDeleteSchedule(): UseDeleteScheduleResult {
  const repo = useMemo(() => getDefaultScheduleRepository(), []);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSchedule = async (id: string): Promise<boolean> => {
    setError(null);
    setIsDeleting(true);

    try {
      await repo.delete(id);
      return true;
    } catch {
      setError("No se pudo eliminar el turno. Intenta nuevamente.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { isDeleting, error, deleteSchedule };
}
