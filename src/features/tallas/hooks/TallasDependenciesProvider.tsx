import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from "react";

import type { TallaTemplateRepository } from "../domain/repository";
import type { TallasDependencies } from "../../../data/local/tallasDependencies";

const TallasDependenciesContext = createContext<TallasDependencies | null>(
  null,
);

interface TallasDependenciesProviderProps extends PropsWithChildren {
  dependencies: TallasDependencies;
}

export function TallasDependenciesProvider({
  dependencies,
  children,
}: TallasDependenciesProviderProps): ReactElement {
  return (
    <TallasDependenciesContext.Provider value={dependencies}>
      {children}
    </TallasDependenciesContext.Provider>
  );
}

export function useTallasDependencies(): TallasDependencies {
  const ctx = useContext(TallasDependenciesContext);
  if (!ctx) {
    throw new Error("TallasDependenciesProvider no fue configurado.");
  }
  return ctx;
}

export function useTallaTemplateRepository(): TallaTemplateRepository {
  return useTallasDependencies().tallaTemplateRepository;
}
