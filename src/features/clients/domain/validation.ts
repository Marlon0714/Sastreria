import { z } from "zod";
import {
  clientSchema,
  camisaMeasurementSchema,
  pantalonMeasurementSchema,
  sacoMeasurementSchema,
  chalecoMeasurementSchema,
} from "./schemas.client.measurements";

export const validateClient = (data: unknown) => clientSchema.safeParse(data);
export const validateCamisaMeasurement = (data: unknown) =>
  camisaMeasurementSchema.safeParse(data);
export const validatePantalonMeasurement = (data: unknown) =>
  pantalonMeasurementSchema.safeParse(data);
export const validateSacoMeasurement = (data: unknown) =>
  sacoMeasurementSchema.safeParse(data);
export const validateChalecoMeasurement = (data: unknown) =>
  chalecoMeasurementSchema.safeParse(data);
