import { z } from "zod";

import { SAFE_FREE_TEXT_PATTERN } from "../../../shared/domain/textPatterns";

/**
 * Dominio: Servicio de sastrería con precio
 *
 * Reglas de negocio:
 * - name: obligatorio, 2-60 caracteres, único por taller (validar en backend futuro)
 * - price: obligatorio, > 0 (un precio de $0 se trata como "no provisto", no
 *   como un precio real), máximo $1.000.000 COP
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
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(SAFE_FREE_TEXT_PATTERN, "El nombre contiene caracteres no permitidos"),
  price: z
    .number()
    .positive("El precio debe ser mayor a 0")
    .max(1000000, "Precio máximo $1.000.000"),
  category: z.enum(PRICING_CATEGORIES),
  notes: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncStatus: z.enum(["pending", "synced", "error"]),
});

export type PricingService = z.infer<typeof pricingServiceSchema>;

export const createPricingServiceSchema = pricingServiceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    syncStatus: true,
  })
  .extend({
    // .optional() + .refine() + .transform() (en vez de .preprocess()) para
    // que z.input<> de este campo siga siendo `number | undefined` (no
    // `unknown`) — así react-hook-form puede tipar el value/onChange del
    // TextInput controlado mientras el campo llega vacío (ver
    // PricingForm.tsx), mientras que z.output<> (lo que usan onSubmit y el
    // repositorio) sigue siendo `number`: el .refine() exige que al enviar
    // el formulario el precio ya haya sido provisto.
    price: z
      .number()
      .positive("El precio debe ser mayor a 0")
      .max(1000000, "Precio máximo $1.000.000")
      .optional()
      .refine((value) => value !== undefined, {
        message: "El precio es obligatorio",
      })
      .transform((value) => value as number),
  });

export type CreatePricingServiceInput = z.infer<
  typeof createPricingServiceSchema
>;

// Tipo de ENTRADA (antes de validar) para el formulario: price puede llegar
// `undefined` mientras el usuario escribe — el resolver de Zod exige que al
// enviar ya sea un número positivo (ver CreatePricingServiceInput, el tipo de
// SALIDA que usan onSubmit/el repositorio).
export type CreatePricingServiceFormInput = z.input<
  typeof createPricingServiceSchema
>;
