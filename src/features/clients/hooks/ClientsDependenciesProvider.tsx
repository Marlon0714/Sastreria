import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from "react";

import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
} from "../domain/repository";

const ClientsDependenciesContext = createContext<ClientsDependencies | null>(
  null,
);

interface ClientsDependenciesProviderProps extends PropsWithChildren {
  dependencies: ClientsDependencies;
}

export function ClientsDependenciesProvider({
  dependencies,
  children,
}: ClientsDependenciesProviderProps): ReactElement {
  return (
    <ClientsDependenciesContext.Provider value={dependencies}>
      {children}
    </ClientsDependenciesContext.Provider>
  );
}

export function useClientsDependencies(): ClientsDependencies {
  const dependencies = useContext(ClientsDependenciesContext);

  if (!dependencies) {
    throw new Error(
      "ClientsDependenciesProvider no fue configurado para los hooks de clients.",
    );
  }

  return dependencies;
}

export function useClientRepository(): ClientRepository {
  return useClientsDependencies().clientRepository;
}

export function useMeasurementRepository(): MeasurementRepository {
  return useClientsDependencies().measurementRepository;
}

export function useTallaRepository(): TallaRepository {
  return useClientsDependencies().tallaRepository;
}
