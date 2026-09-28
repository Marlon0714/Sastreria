import { z } from "zod";

import { SAFE_FREE_TEXT_PATTERN } from "../../../shared/domain/textPatterns";

/**
 * Puerto AppSocket/JetDirect estándar para impresoras térmicas de red
 * (ver `escposRaster.ts`/`TcpLabelPrinterRepositoryImpl.ts`). Se usa como
 * valor por defecto cuando el usuario no especifica uno distinto.
 */
export const DEFAULT_LABEL_PRINTER_PORT = 9100;

/**
 * Host/IP de la impresora en la red local. Acepta tanto una IPv4
 * (`192.168.1.50`) como un hostname simple (`impresora-mostrador`) — no se
 * valida que sea una IPv4 estrictamente bien formada porque el taller
 * también puede tener DNS local o mDNS.
 */
const HOST_PATTERN = /^[a-zA-Z0-9.-]+$/;

export const printerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(40, "Máximo 40 caracteres")
    .regex(SAFE_FREE_TEXT_PATTERN, "El nombre contiene caracteres no permitidos"),
  host: z
    .string()
    .trim()
    .min(1, "La dirección de la impresora es obligatoria")
    .max(255)
    .regex(HOST_PATTERN, "La dirección solo puede contener letras, números, puntos y guiones"),
  port: z
    .number()
    .int("El puerto debe ser un número entero")
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65536"),
});

export type PrinterConfig = z.infer<typeof printerConfigSchema>;

/**
 * Input del formulario para agregar una impresora nueva: `port` es opcional
 * y toma `DEFAULT_LABEL_PRINTER_PORT` si no se especifica (la mayoría de
 * impresoras térmicas WiFi usan el puerto 9100 por convención).
 */
export const createPrinterConfigSchema = printerConfigSchema
  .omit({ id: true })
  .extend({
    port: z
      .number()
      .int("El puerto debe ser un número entero")
      .min(1, "El puerto debe ser mayor a 0")
      .max(65535, "El puerto debe ser menor a 65536")
      .optional()
      .transform((value) => value ?? DEFAULT_LABEL_PRINTER_PORT),
  });

export type CreatePrinterConfigInput = z.input<typeof createPrinterConfigSchema>;
export type CreatePrinterConfigOutput = z.output<typeof createPrinterConfigSchema>;

/**
 * Violación de una regla de negocio esperada (host/puerto inválidos al
 * agregar una impresora) — su mensaje ya está listo para mostrarse tal cual
 * al usuario, igual que `ScheduleValidationError`.
 */
export class PrinterConfigValidationError extends Error {}

/**
 * Valida el input del formulario "agregar impresora". Lanza
 * `PrinterConfigValidationError` (mensaje ya en español, listo para
 * `Alert.alert`) si el nombre/host/puerto no son válidos.
 */
export function parsePrinterConfigInput(
  input: CreatePrinterConfigInput,
): CreatePrinterConfigOutput {
  const result = createPrinterConfigSchema.safeParse(input);
  if (!result.success) {
    throw new PrinterConfigValidationError(
      result.error.issues[0]?.message ?? "Datos de impresora inválidos",
    );
  }
  return result.data;
}
