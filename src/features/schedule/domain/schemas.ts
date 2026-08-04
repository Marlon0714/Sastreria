import { z } from "zod";

export const scheduleStatusSchema = z.enum([
  "pendiente",
  "agendado",
  "en_proceso",
  "listo_para_entregar",
  "entregado",
]);

// "" se trata como "sin valor" — los campos de fecha/hora son opcionales
// (input de texto libre hoy; se reemplaza por un picker nativo en Fase 8).
// Nota: se valida con .refine() en vez de .preprocess() para que el tipo de
// entrada (z.input) siga siendo `string | undefined`, no `unknown` — react-hook-form
// necesita ese tipo concreto para tipar el value de los TextInput controlados.
const optionalDate = z
  .string()
  .optional()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "La fecha debe tener el formato AAAA-MM-DD",
  )
  .transform((value) => (value ? value : undefined));

const optionalTime = z
  .string()
  .optional()
  .refine(
    (value) => !value || /^\d{2}:\d{2}$/.test(value),
    "La hora debe tener el formato HH:MM",
  )
  .transform((value) => (value ? value : undefined));

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid("El cliente es inválido"),
  date: optionalDate,
  time: optionalTime,
  price: z.number().nonnegative("El precio no puede ser negativo").optional(),
  operarioId: z.string().uuid("El operario es inválido").optional(),
  notes: z.string().trim().max(500).optional(),
  status: scheduleStatusSchema,
  readyAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]),
});

export const createScheduleSchema = scheduleSchema.omit({
  id: true,
  status: true,
  readyAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true,
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleSchemaInput = z.input<typeof createScheduleSchema>;
export type CreateScheduleSchemaOutput = z.output<typeof createScheduleSchema>;
export type UpdateScheduleSchemaInput = z.input<typeof updateScheduleSchema>;
