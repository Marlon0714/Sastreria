import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import type { Client } from "../domain/types";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseClientListResult {
  clients: Client[];
  isLoading: boolean;
  isRefreshing: boolean;
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);

  const loadClients = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);

    if (hasDataRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextClients = await clientRepository.findAll();
      hasDataRef.current = nextClients.length > 0;
      setClients(nextClients);
    } catch {
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      inFlightRef.current = false;
    }
  }, [clientRepository]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return {
    clients,
    isLoading,
    isRefreshing,
    error,
    reload: loadClients,
  };
}
