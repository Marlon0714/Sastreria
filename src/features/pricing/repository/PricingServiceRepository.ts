import type {
  PricingService,
  CreatePricingServiceInput,
} from "../domain/pricingService";

export interface PricingServiceRepository {
  getAll(): Promise<PricingService[]>;
  getById(id: string): Promise<PricingService | null>;
  create(input: CreatePricingServiceInput): Promise<PricingService>;
  update(
    id: string,
    input: Partial<CreatePricingServiceInput>,
  ): Promise<PricingService>;
  delete(id: string): Promise<void>;
}
