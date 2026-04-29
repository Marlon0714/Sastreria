import { useCallback, useEffect, useState } from "react";

import { ClientRepositoryImpl } from "../../../data/local/ClientRepositoryImpl";
import type { Client } from "../domain/types";

const clientRepository = new ClientRepositoryImpl();

interface UseClientListResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useClientList(): UseClientListResult {
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
  }, []);

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
