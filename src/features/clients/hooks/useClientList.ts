import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { Client } from "../domain/types";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseClientListResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

type UseClientListDependencies = Pick<
  ClientsDependenciesOverrides,
  "clientRepository"
>;

export function useClientList(
  dependencies: UseClientListDependencies = {},
): UseClientListResult {
  const defaultClientRepository = useClientRepository();
  const clientRepository = useMemo(
    () => dependencies.clientRepository ?? defaultClientRepository,
    [defaultClientRepository, dependencies.clientRepository],
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const nextClients = await clientRepository.findAll();
      setClients(nextClients);
    } catch {
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setIsLoading(false);
    }
  }, [clientRepository]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return {
    clients,
    isLoading,
    error,
    reload: loadClients,
  };
}
