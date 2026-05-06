import { describe, expect, it } from "@jest/globals";
import {
  pricingServiceSchema,
  createPricingServiceSchema,
} from "../domain/pricingService";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const validService = {
  id: VALID_UUID,
  name: "Arreglo de pantalón",
  price: 25000,
  notes: "Incluye dobladillo",
  createdAt: "2024-05-06T12:00:00.000Z",
  updatedAt: "2024-05-06T12:00:00.000Z",
  syncStatus: "pending",
};

describe("pricingServiceSchema", () => {
  it("valida correctamente un servicio válido", () => {
    expect(pricingServiceSchema.safeParse(validService).success).toBe(true);
  });

  it("falla si el nombre es muy corto", () => {
    const result = pricingServiceSchema.safeParse({ ...validService, name: "A" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("name");
  });

  it("falla si el precio es negativo", () => {
    const result = pricingServiceSchema.safeParse({ ...validService, price: -1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("price");
  });

  it("falla si falta un campo requerido", () => {
    const { createdAt: _, ...noCreatedAt } = validService;
    const result = pricingServiceSchema.safeParse(noCreatedAt);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("createdAt");
  });

  it("acepta notes como null o undefined", () => {
    expect(pricingServiceSchema.safeParse({ ...validService, notes: null }).success).toBe(true);
    expect(pricingServiceSchema.safeParse({ ...validService, notes: undefined }).success).toBe(true);
  });
});

describe("createPricingServiceSchema", () => {
  it("valida correctamente un input válido", () => {
    const input = { name: "Basta de dobladillo", price: 15000 };
    expect(createPricingServiceSchema.safeParse(input).success).toBe(true);
  });

  it("falla si falta el nombre", () => {
    const result = createPricingServiceSchema.safeParse({ price: 5000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("name");
  });

  it("falla si el nombre es muy corto", () => {
    const result = createPricingServiceSchema.safeParse({ name: "X", price: 5000 });
    expect(result.success).toBe(false);
  });

  it("acepta notes opcional", () => {
    expect(createPricingServiceSchema.safeParse({ name: "Bordado", price: 5000, notes: "ok" }).success).toBe(true);
    expect(createPricingServiceSchema.safeParse({ name: "Bordado", price: 5000 }).success).toBe(true);
  });
});
