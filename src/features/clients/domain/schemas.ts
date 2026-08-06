import { z } from "zod";

import {
  ID_DIGITS_PATTERN,
  PERSON_NAME_PATTERN,
  PHONE_DIGITS_PATTERN,
  normalizeDigitsInput,
} from "../../../shared/domain/textPatterns";

/**
 * Campo opcional de medida (para camisa/pantalón).
 * Acepta string vacío, undefined, null o número. Convierte string vacío a null
 * y aplica reemplazo de coma decimal por punto.
 */
const optionalMeasurementField = z.preprocess(
  (value: unknown): unknown => {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        return null;
      }
      return trimmed.replace(",", ".");
    }
    return value;
  },
  z.union([z.coerce.number().positive().max(300), z.null()]),
);

const optionalNotesField = z
  .preprocess(
    (value: unknown): unknown => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return value;
    },
    z.union([z.string().max(500), z.null()]),
  )
  .optional();

const optionalChangedByField = z
  .preprocess(
    (value: unknown): unknown => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return value;
    },
    z.union([z.string().max(120), z.null()]),
  )
  .optional();

const optionalPhoneField = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : normalizeDigitsInput(v)))
  .refine((v) => v === undefined || PHONE_DIGITS_PATTERN.test(v), {
    message: "El teléfono solo puede contener números",
  });

// Transforma a "" en vez de undefined: la columna es NOT NULL (acepta "" sin migración)
// y así `phone` se mantiene como `string` en el tipo de salida.
const primaryPhoneField = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v ? normalizeDigitsInput(v) : ""))
  .refine((v) => v === "" || PHONE_DIGITS_PATTERN.test(v), {
    message: "El teléfono solo puede contener números",
  });

const optionalCedulaField = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : normalizeDigitsInput(v)))
  .refine((v) => v === undefined || ID_DIGITS_PATTERN.test(v), {
    message: "La cédula solo puede contener números",
  });

const personNameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `El ${label} es obligatorio`)
    .max(80)
    .regex(PERSON_NAME_PATTERN, `El ${label} solo puede contener letras`);

export const createClientSchema = z.object({
  firstName: personNameField("nombre"),
  lastName: personNameField("apellido"),
  phone: primaryPhoneField,
  phone2: optionalPhoneField,
  phone3: optionalPhoneField,
  cedula: optionalCedulaField,
  notes: z.string().trim().max(500).optional(),
});

export const upsertCamisaSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  espalda: optionalMeasurementField.optional(),
  hombro: optionalMeasurementField.optional(),
  talleDelantero: optionalMeasurementField.optional(),
  talleTrasero: optionalMeasurementField.optional(),
  distancia: optionalMeasurementField.optional(),
  separacion: optionalMeasurementField.optional(),
  pechoAjustado: optionalMeasurementField.optional(),
  pechoAncho: optionalMeasurementField.optional(),
  cinturaAjustado: optionalMeasurementField.optional(),
  cinturaAncho: optionalMeasurementField.optional(),
  baseAjustado: optionalMeasurementField.optional(),
  baseAncho: optionalMeasurementField.optional(),
  largo: optionalMeasurementField.optional(),
  mangaLarga: optionalMeasurementField.optional(),
  mangaCorta: optionalMeasurementField.optional(),
  escote: optionalMeasurementField.optional(),
  cuelloNormal: optionalMeasurementField.optional(),
  cuelloCruce: optionalMeasurementField.optional(),
  brazo: optionalMeasurementField.optional(),
  puno: optionalMeasurementField.optional(),
  changedBy: optionalChangedByField,
  notes: optionalNotesField,
});

export const upsertPantalonSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  largo: optionalMeasurementField.optional(),
  entrepierna: optionalMeasurementField.optional(),
  cintura: optionalMeasurementField.optional(),
  base: optionalMeasurementField.optional(),
  tiro: optionalMeasurementField.optional(),
  pierna: optionalMeasurementField.optional(),
  rodilla: optionalMeasurementField.optional(),
  bota: optionalMeasurementField.optional(),
  changedBy: optionalChangedByField,
  notes: optionalNotesField,
});

export const upsertSacoSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  espalda: optionalMeasurementField.optional(),
  hombro: optionalMeasurementField.optional(),
  talleDelantero: optionalMeasurementField.optional(),
  talleTrasero: optionalMeasurementField.optional(),
  distancia: optionalMeasurementField.optional(),
  separacion: optionalMeasurementField.optional(),
  pechoAjustado: optionalMeasurementField.optional(),
  pechoAncho: optionalMeasurementField.optional(),
  cinturaAjustado: optionalMeasurementField.optional(),
  cinturaAncho: optionalMeasurementField.optional(),
  baseAjustado: optionalMeasurementField.optional(),
  baseAncho: optionalMeasurementField.optional(),
  largo: optionalMeasurementField.optional(),
  mangaLarga: optionalMeasurementField.optional(),
  mangaCorta: optionalMeasurementField.optional(),
  escote: optionalMeasurementField.optional(),
  cuelloNormal: optionalMeasurementField.optional(),
  cuelloCruce: optionalMeasurementField.optional(),
  brazo: optionalMeasurementField.optional(),
  puno: optionalMeasurementField.optional(),
  notes: optionalNotesField,
});

export const upsertChalecoSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  espalda: optionalMeasurementField.optional(),
  talleTrasero: optionalMeasurementField.optional(),
  largo: optionalMeasurementField.optional(),
  pechoAjustado: optionalMeasurementField.optional(),
  pechoAncho: optionalMeasurementField.optional(),
  cinturaAjustado: optionalMeasurementField.optional(),
  cinturaAncho: optionalMeasurementField.optional(),
  baseAjustado: optionalMeasurementField.optional(),
  baseAncho: optionalMeasurementField.optional(),
  escote: optionalMeasurementField.optional(),
  notes: optionalNotesField,
});

export type UpsertSacoSchemaInput = z.input<typeof upsertSacoSchema>;
export type UpsertSacoSchemaOutput = z.output<typeof upsertSacoSchema>;

export type UpsertChalecoSchemaInput = z.input<typeof upsertChalecoSchema>;
export type UpsertChalecoSchemaOutput = z.output<typeof upsertChalecoSchema>;

export type CreateClientSchemaInput = z.input<typeof createClientSchema>;
export type CreateClientSchemaOutput = z.output<typeof createClientSchema>;

export const updateClientSchema = z.object({
  id: z.string().uuid("El id de cliente es inválido"),
  firstName: personNameField("nombre"),
  lastName: personNameField("apellido"),
  phone: primaryPhoneField,
  phone2: optionalPhoneField,
  phone3: optionalPhoneField,
  cedula: optionalCedulaField,
  notes: z.string().trim().max(500).optional(),
});

export type UpdateClientSchemaInput = z.input<typeof updateClientSchema>;
export type UpdateClientSchemaOutput = z.output<typeof updateClientSchema>;

export type UpsertCamisaSchemaInput = z.input<typeof upsertCamisaSchema>;
export type UpsertCamisaSchemaOutput = z.output<typeof upsertCamisaSchema>;

export type UpsertPantalonSchemaInput = z.input<typeof upsertPantalonSchema>;
export type UpsertPantalonSchemaOutput = z.output<typeof upsertPantalonSchema>;

// ─── Tallas ──────────────────────────────────────────────────────────────────────

export const createTallaSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  type: z.enum(["camisa", "pantalon", "saco", "chaleco"]),
  value: z.string().trim().min(1, "La talla es obligatoria").max(20),
  notes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const updateTallaSchema = createTallaSchema.extend({
  id: z.string().uuid("El id de talla es inválido"),
});

export type CreateTallaSchemaInput = z.input<typeof createTallaSchema>;
export type CreateTallaSchemaOutput = z.output<typeof createTallaSchema>;
export type UpdateTallaSchemaInput = z.input<typeof updateTallaSchema>;
export type UpdateTallaSchemaOutput = z.output<typeof updateTallaSchema>;
