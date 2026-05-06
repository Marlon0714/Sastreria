import { z } from "zod";
import { ScheduleStatus } from "./types";

export const scheduleStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientId: z.string().uuid(),
  notes: z.string().optional(),
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
