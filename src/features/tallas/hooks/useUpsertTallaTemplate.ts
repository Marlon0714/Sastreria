import { useCallback, useState } from "react";
import type {
  TallaTemplate,
  CreateTallaTemplateDTO,
  UpdateTallaTemplateDTO,
} from "../domain/types";
import { useTallaTemplateRepository } from "./TallasDependenciesProvider";

interface UseUpsertTallaTemplateResult {
  isSubmitting: boolean;
  error: string | null;
  createTemplate: (
    dto: CreateTallaTemplateDTO,
  ) => Promise<TallaTemplate | null>;
  updateTemplate: (
    dto: UpdateTallaTemplateDTO,
  ) => Promise<TallaTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
}

export function useUpsertTallaTemplate(): UseUpsertTallaTemplateResult {
  const repo = useTallaTemplateRepository();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTemplate = useCallback(
    async (dto: CreateTallaTemplateDTO): Promise<TallaTemplate | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await repo.create(dto);
      } catch {
        setError("No se pudo guardar la talla.");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repo],
  );

  const updateTemplate = useCallback(
    async (dto: UpdateTallaTemplateDTO): Promise<TallaTemplate | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await repo.update(dto);
      } catch {
        setError("No se pudo actualizar la talla.");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repo],
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await repo.delete(id);
        return true;
      } catch {
        setError("No se pudo eliminar la talla.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repo],
  );

  return {
    isSubmitting,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
