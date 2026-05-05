import { useMemo, useState } from "react";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseDeleteClientResult {
  isDeleting: boolean;
  error: string | null;
  deleteClient: (id: string) => Promise<boolean>;
}

type UseDeleteClientDependencies = Pick<
  ClientsDependenciesOverrides,
  "clientRepository"
>;

export function useDeleteClient(
  dependencies: UseDeleteClientDependencies = {},
): UseDeleteClientResult {
  const defaultClientRepository = useClientRepository();
  const clientRepository = useMemo(
    () => dependencies.clientRepository ?? defaultClientRepository,
    [defaultClientRepository, dependencies.clientRepository],
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteClient = async (id: string): Promise<boolean> => {
    setError(null);
    setIsDeleting(true);

    try {
      await clientRepository.delete(id);
      return true;
    } catch {
      setError("No se pudo eliminar el cliente. Intenta nuevamente.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    error,
    deleteClient,
  };
}
