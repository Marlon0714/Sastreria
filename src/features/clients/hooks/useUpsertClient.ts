import { useCallback } from "react";
import { useClientRepository } from "./ClientsDependenciesProvider";
import type { Client, CreateClientDTO, UpdateClientDTO } from "../domain/types";

export function useUpsertClient() {
  const clientRepository = useClientRepository();

  const upsert = useCallback(
    async (input: CreateClientDTO | UpdateClientDTO): Promise<Client> => {
      if ("id" in input) {
        return clientRepository.update(input);
      }
      return clientRepository.create(input);
    },
    [clientRepository],
  );

  return { upsert };
}
