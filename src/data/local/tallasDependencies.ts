import type { TallaTemplateRepository } from "../../features/tallas/domain/repository";
import { TallaTemplateRepositoryImpl } from "./TallaTemplateRepositoryImpl";

let defaultTallaTemplateRepository: TallaTemplateRepository | null = null;

export interface TallasDependencies {
  tallaTemplateRepository: TallaTemplateRepository;
}

export function getTallasDependencies(): TallasDependencies {
  if (!defaultTallaTemplateRepository) {
    defaultTallaTemplateRepository = new TallaTemplateRepositoryImpl();
  }
  return {
    tallaTemplateRepository: defaultTallaTemplateRepository,
  };
}
