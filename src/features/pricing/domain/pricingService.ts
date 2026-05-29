import { z } from "zod";

/**
 * Dominio: Servicio de sastrería con precio
 *
 * Reglas de negocio:
 * - name: obligatorio, 2-60 caracteres, único por taller (validar en backend futuro)
 * - price: obligatorio, >= 0, máximo $1.000.000 COP
 * - category: 'arreglo' | 'confeccion'
 * - notes: opcional, máximo 200 caracteres
 * - id: UUID v4
 * - createdAt/updatedAt: ISO 8601, generados automáticamente
 * - syncStatus: 'pending' | 'synced' | 'error' (offline-first)
 *
 * Validaciones centralizadas en Zod schema.
 */
export const PRICING_CATEGORIES = ["arreglo", "confeccion"] as const;
export type PricingCategory = (typeof PRICING_CATEGORIES)[number];

export const PRICING_CATEGORY_LABELS: Record<PricingCategory, string> = {
  arreglo: "Arreglos",
  confeccion: "Confecciones",
};

export const pricingServiceSchema = z.object({
  id: z.string().uuid(), // UUID v4
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
  price: z
    .number()
    .min(0, "El precio no puede ser negativo")
    .max(1000000, "Precio máximo $1.000.000"),
  category: z.enum(PRICING_CATEGORIES),
  notes: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
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
