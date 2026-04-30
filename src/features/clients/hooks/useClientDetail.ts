import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { Client } from "../domain/types";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseClientDetailResult {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UseClientDetailDependencies = Pick<
  ClientsDependenciesOverrides,
  "clientRepository"
>;

export function useClientDetail(
  clientId: string,
  dependencies: UseClientDetailDependencies = {},
): UseClientDetailResult {
  const defaultClientRepository = useClientRepository();
  const clientRepository = useMemo(
    () => dependencies.clientRepository ?? defaultClientRepository,
    [defaultClientRepository, dependencies.clientRepository],
  );
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadClient = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const next = await clientRepository.findById(clientId);
      if (!next) {
        setError("El cliente no existe o fue eliminado.");
        setClient(null);
        return;
      }
      setClient(next);
    } catch {
      setError("No se pudo cargar el detalle del cliente.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientRepository]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  return {
    client,
    isLoading,
    error,
    reload: loadClient,
  };
}
