import type { TallaTemplateRepository } from "../../features/tallas/domain/repository";
import { scheduleSyncRun } from "./clientsDependencies";
import { TallaTemplateRepositoryImpl } from "./TallaTemplateRepositoryImpl";

let defaultTallaTemplateRepository: TallaTemplateRepository | null = null;

export interface TallasDependencies {
  tallaTemplateRepository: TallaTemplateRepository;
}

export function getTallasDependencies(): TallasDependencies {
  if (!defaultTallaTemplateRepository) {
    defaultTallaTemplateRepository = new TallaTemplateRepositoryImpl({
      onWriteCommitted: scheduleSyncRun,
    });
  }
  return {
    tallaTemplateRepository: defaultTallaTemplateRepository,
  };
}
