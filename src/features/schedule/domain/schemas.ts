import { z } from "zod";

import { capitalizeWords } from "../../../shared/domain/textPatterns";

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

export const scheduleCategorySchema = z.enum(["arreglo", "confeccion"]);

// Exactamente uno de clientId/unregisteredClientName debe venir del
// formulario — el turno o tiene un cliente registrado, o guarda solo el
// nombre de quien no quiso registrarse, nunca ambos ni ninguno.
const exactlyOneClientField = (data: {
  clientId?: string;
  unregisteredClientName?: string;
}): boolean => Boolean(data.clientId) !== Boolean(data.unregisteredClientName);

const CLIENT_FIELD_ERROR: { message: string; path: string[] } = {
  message: "Elige un cliente o escribe un nombre, no ambos ni ninguno",
  path: ["clientId"],
};

// El abono es dinero ya recibido a cuenta del precio — no tiene sentido que
// supere el total del arreglo/confección.
const abonoNotExceedingPrice = (data: {
  price?: number;
  abono?: number;
}): boolean =>
  data.abono == null || data.price == null || data.abono <= data.price;

const ABONO_FIELD_ERROR: { message: string; path: string[] } = {
  message: "El abono no puede ser mayor que el precio",
  path: ["abono"],
};

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid("El cliente es inválido").optional(),
  unregisteredClientName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? capitalizeWords(v) : v)),
  date: optionalDate,
  time: optionalTime,
  price: z.number().nonnegative("El precio no puede ser negativo").optional(),
  abono: z.number().nonnegative("El abono no puede ser negativo").optional(),
  operarioId: z.string().uuid("El operario es inválido").optional(),
  notes: z.string().trim().max(500).optional(),
  isPriority: z.boolean().optional(),
  category: scheduleCategorySchema.optional(),
  status: scheduleStatusSchema,
  statusLocked: z.boolean(),
  readyAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]),
});

const createScheduleObjectSchema = scheduleSchema.omit({
  id: true,
  status: true,
  statusLocked: true,
  readyAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true,
});

export const createScheduleSchema = createScheduleObjectSchema
  .refine(exactlyOneClientField, CLIENT_FIELD_ERROR)
  .refine(abonoNotExceedingPrice, ABONO_FIELD_ERROR);

// Sin el refine de createScheduleSchema: una actualización parcial legítima
// (ej. solo cambiar el precio) no debe tocar clientId/unregisteredClientName
// y no tiene por qué traer ninguno de los dos.
export const updateScheduleSchema = createScheduleObjectSchema.partial();

export type CreateScheduleSchemaInput = z.input<typeof createScheduleSchema>;
export type CreateScheduleSchemaOutput = z.output<typeof createScheduleSchema>;
export type UpdateScheduleSchemaInput = z.input<typeof updateScheduleSchema>;
