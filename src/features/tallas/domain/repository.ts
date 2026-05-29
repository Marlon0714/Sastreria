import type {
  TallaTemplate,
  CreateTallaTemplateDTO,
  UpdateTallaTemplateDTO,
  TallaGarmentType,
} from "./types";

export interface TallaTemplateRepository {
  findAll(): Promise<TallaTemplate[]>;
  findByType(type: TallaGarmentType): Promise<TallaTemplate[]>;
  create(dto: CreateTallaTemplateDTO): Promise<TallaTemplate>;
  update(dto: UpdateTallaTemplateDTO): Promise<TallaTemplate>;
  delete(id: string): Promise<void>;
}
