import { z } from "zod";

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

export const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  phone: z.string().trim().min(7, "El teléfono no es válido").max(30),
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
  pecho: optionalMeasurementField.optional(),
  cintura: optionalMeasurementField.optional(),
  base: optionalMeasurementField.optional(),
  largo: optionalMeasurementField.optional(),
  largoManga: optionalMeasurementField.optional(),
  anchoManga: optionalMeasurementField.optional(),
  escote: optionalMeasurementField.optional(),
  notes: optionalNotesField,
});

export const upsertPantalonSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  largo: optionalMeasurementField.optional(),
  cintura: optionalMeasurementField.optional(),
  base: optionalMeasurementField.optional(),
  tiro: optionalMeasurementField.optional(),
  pierna: optionalMeasurementField.optional(),
  rodilla: optionalMeasurementField.optional(),
  bota: optionalMeasurementField.optional(),
  notes: optionalNotesField,
});

export type CreateClientSchemaInput = z.input<typeof createClientSchema>;
export type CreateClientSchemaOutput = z.output<typeof createClientSchema>;

export type UpsertCamisaSchemaInput = z.input<typeof upsertCamisaSchema>;
export type UpsertCamisaSchemaOutput = z.output<typeof upsertCamisaSchema>;

export type UpsertPantalonSchemaInput = z.input<typeof upsertPantalonSchema>;
export type UpsertPantalonSchemaOutput = z.output<typeof upsertPantalonSchema>;
