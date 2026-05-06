import { z } from "zod";

/**
 * Dominio: Servicio de sastrería con precio
 */
export const pricingServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(60),
  price: z.number().min(0).max(1000000),
  notes: z.string().max(200).optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncStatus: z.enum(["pending", "synced", "error"]),
});

export type PricingService = z.infer<typeof pricingServiceSchema>;

export const createPricingServiceSchema = pricingServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true,
});

export type CreatePricingServiceInput = z.infer<
  typeof createPricingServiceSchema
>;
