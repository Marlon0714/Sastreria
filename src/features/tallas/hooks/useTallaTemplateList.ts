import { useCallback, useEffect, useState } from "react";
import type { TallaTemplate, TallaGarmentType } from "../domain/types";
import { useTallaTemplateRepository } from "./TallasDependenciesProvider";

interface UseTallaTemplateListResult {
  templates: TallaTemplate[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useTallaTemplateList(
  type?: TallaGarmentType,
): UseTallaTemplateListResult {
  const repo = useTallaTemplateRepository();
  const [templates, setTemplates] = useState<TallaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = type ? await repo.findByType(type) : await repo.findAll();
      setTemplates(result);
    } catch {
      setError("No se pudieron cargar las tallas.");
    } finally {
      setIsLoading(false);
    }
  }, [repo, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return { templates, isLoading, error, reload: load };
}
