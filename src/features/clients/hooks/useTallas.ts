import { useCallback, useEffect, useState } from "react";

import {
  createTallaSchema,
  updateTallaSchema,
  type CreateTallaSchemaInput,
  type UpdateTallaSchemaInput,
} from "../domain/schemas";
import type { ClientTalla } from "../domain/types";
import { useTallaRepository } from "./ClientsDependenciesProvider";

export function useTallas(clientId: string): {
  tallas: ClientTalla[];
  isLoading: boolean;
  error: string | null;
  upsertTalla: (
    input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
  ) => Promise<ClientTalla | null>;
  deleteTalla: (id: string) => Promise<boolean>;
  reload: () => Promise<void>;
} {
  const repo = useTallaRepository();
  const [tallas, setTallas] = useState<ClientTalla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repo.findByClientId(clientId);
      setTallas(data);
    } catch {
      setError("Error al cargar las tallas.");
    } finally {
      setIsLoading(false);
    }
  }, [repo, clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertTalla = useCallback(
    async (
      input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
    ): Promise<ClientTalla | null> => {
      setError(null);
      try {
        let talla: ClientTalla;
        if ("id" in input) {
          const result = updateTallaSchema.safeParse(input);
          if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Datos inválidos.");
            return null;
          }
          talla = await repo.upsert(result.data);
        } else {
          const result = createTallaSchema.safeParse(input);
          if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Datos inválidos.");
            return null;
          }
          talla = await repo.upsert(result.data);
        }
        await reload();
        return talla;
      } catch {
        setError("Error al guardar la talla.");
        return null;
      }
    },
    [repo, reload],
  );

  const deleteTalla = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        await repo.delete(id);
        await reload();
        return true;
      } catch {
        setError("Error al eliminar la talla.");
        return false;
      }
    },
    [repo, reload],
  );

  return { tallas, isLoading, error, upsertTalla, deleteTalla, reload };
}
