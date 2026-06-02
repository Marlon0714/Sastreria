import { z } from "zod";

// Validación de teléfonos: 1-3, regex local
const phoneRegex = /^([0-9\-\+\s]{7,15})$/;
export const phonesSchema = z
  .array(z.string().regex(phoneRegex, "Teléfono inválido"))
  .min(1, "Al menos un teléfono")
  .max(3, "Máximo 3 teléfonos");

export const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  lastName: z.string().min(1),
  phones: phonesSchema,
  cedula: z
    .string()
    .regex(/^\d{6,12}$/, "Cédula inválida")
    .optional()
    .or(z.literal(undefined)),
  notes: z.string().max(500).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const nonNegative = z.number().min(0);

export const camisaMeasurementSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  espalda: nonNegative.optional(),
  talleTrasero: nonNegative.optional(),
  largo: nonNegative.optional(),
  pecho: nonNegative.optional(),
  cintura: nonNegative.optional(),
  base: nonNegative.optional(),
  escote: nonNegative.optional(),
  cuello: nonNegative.optional(),
  brazo: nonNegative.optional(),
  puno: nonNegative.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pantalonMeasurementSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  largo: nonNegative.optional(),
  cintura: nonNegative.optional(),
  base: nonNegative.optional(),
  tiro: nonNegative.optional(),
  pierna: nonNegative.optional(),
  rodilla: nonNegative.optional(),
  bota: nonNegative.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sacoMeasurementSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  espalda: nonNegative.optional(),
  talleTrasero: nonNegative.optional(),
  largo: nonNegative.optional(),
  pecho: nonNegative.optional(),
  cintura: nonNegative.optional(),
  base: nonNegative.optional(),
  escote: nonNegative.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chalecoMeasurementSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  espalda: nonNegative.optional(),
  talleTrasero: nonNegative.optional(),
  largo: nonNegative.optional(),
  pecho: nonNegative.optional(),
  cintura: nonNegative.optional(),
  base: nonNegative.optional(),
  escote: nonNegative.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
