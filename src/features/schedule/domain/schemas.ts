import { z } from "zod";

export const scheduleStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "La hora debe tener el formato HH:MM"),
  clientId: z.string().uuid("El cliente es inválido"),
  notes: z.string().trim().max(500).optional(),
  status: scheduleStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]),
});

export const createScheduleSchema = scheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true,
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleSchemaInput = z.input<typeof createScheduleSchema>;
export type CreateScheduleSchemaOutput = z.output<typeof createScheduleSchema>;
export type UpdateScheduleSchemaInput = z.input<typeof updateScheduleSchema>;
