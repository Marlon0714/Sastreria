import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { PricingServiceRepository } from "./PricingServiceRepository";
import type {
  PricingService,
  CreatePricingServiceInput,
} from "../domain/pricingService";

const mockService: PricingService = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Arreglo de saco",
  price: 35000,
  category: "arreglo",
  notes: "Incluye hombreras",
  createdAt: "2024-05-06T12:00:00.000Z",
  updatedAt: "2024-05-06T12:00:00.000Z",
  syncStatus: "pending",
};

const mockInput: CreatePricingServiceInput = {
  name: "Arreglo de saco",
  price: 35000,
  category: "arreglo",
  notes: "Incluye hombreras",
};

describe("PricingServiceRepository (contrato)", () => {
  let repo: PricingServiceRepository;

  beforeEach(() => {
    repo = {
      getAll: jest
        .fn<() => Promise<PricingService[]>>()
        .mockResolvedValue([mockService]),
      getById: jest
        .fn<(id: string) => Promise<PricingService | null>>()
        .mockResolvedValue(mockService),
      create: jest
        .fn<(input: CreatePricingServiceInput) => Promise<PricingService>>()
        .mockResolvedValue(mockService),
      update: jest
        .fn<
          (
            id: string,
            input: Partial<CreatePricingServiceInput>,
          ) => Promise<PricingService>
        >()
        .mockResolvedValue(mockService),
      delete: jest
        .fn<(id: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
  });

  it("getAll retorna lista de servicios", async () => {
    const result = await repo.getAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(mockService.id);
  });

  it("getById retorna servicio si existe", async () => {
    const result = await repo.getById(mockService.id);
    expect(result).toBeTruthy();
    expect(result?.id).toBe(mockService.id);
  });

  it("getById retorna null si no existe", async () => {
    (repo.getById as ReturnType<typeof jest.fn>).mockResolvedValueOnce(null);
    const result = await repo.getById("no-existe");
    expect(result).toBeNull();
  });

  it("create retorna el servicio creado", async () => {
    const result = await repo.create(mockInput);
    expect(result.name).toBe(mockInput.name);
  });

  it("update retorna el servicio actualizado", async () => {
    const result = await repo.update(mockService.id, { price: 40000 });
    expect(result.price).toBe(mockService.price);
  });

  it("delete no lanza error", async () => {
    await expect(repo.delete(mockService.id)).resolves.toBeUndefined();
  });
});
