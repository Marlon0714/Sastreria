import { z } from "zod";

const measurementNumberSchema = z.preprocess((value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(",", ".");
}, z.coerce.number().positive().max(300));

export const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  phone: z.string().trim().min(7, "El teléfono no es válido").max(30),
  notes: z.string().trim().max(500).optional(),
});

export const addMeasurementSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  measuredAt: z
    .string()
    .trim()
    .datetime({
      offset: true,
      message: "La fecha debe estar en formato ISO 8601 con zona horaria",
    })
    .optional(),
  pechoCm: measurementNumberSchema,
  cinturaCm: measurementNumberSchema,
  caderaCm: measurementNumberSchema,
  largoCm: measurementNumberSchema,
  notes: z.string().trim().max(500).optional(),
});

export type CreateClientSchemaInput = z.input<typeof createClientSchema>;
export type CreateClientSchemaOutput = z.output<typeof createClientSchema>;

export type AddMeasurementSchemaInput = z.input<typeof addMeasurementSchema>;
export type AddMeasurementSchemaOutput = z.output<typeof addMeasurementSchema>;
