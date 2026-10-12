import { z } from "zod";

import type { PrinterSettingsRepository } from "../../features/printing/domain/repository";
import { printerConfigSchema } from "../../features/printing/domain/printerConfig";
import type { PrinterSettingsSnapshot } from "../../features/printing/domain/types";
import { getSupabaseClient } from "./client";

const SETTINGS_ROW_ID = "workshop";
const printerSchema = printerConfigSchema.extend({ id: z.string().uuid() });

/**
 * El proyecto Supabase es propio de un solo negocio, por eso existe una única
 * fila compartida. RLS restringe las escrituras a perfiles con rol owner.
 */
export class SupabasePrinterSettingsRepository
  implements PrinterSettingsRepository
{
  async load(): Promise<PrinterSettingsSnapshot | null> {
    const { data, error } = await getSupabaseClient()
      .from("printer_settings")
      .select("printers, default_printer_id, updated_at")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      throw new Error(
        "No se pudo consultar la configuración compartida de impresoras.",
      );
    }
    if (!data) return null;

    const printersValue: unknown = data.printers;
    const parsedPrinters = z.array(printerSchema).safeParse(printersValue);
    if (!parsedPrinters.success) {
      throw new Error(
        "La configuración compartida de impresoras tiene un formato inválido.",
      );
    }

    const defaultValue: unknown = data.default_printer_id;
    const defaultPrinterId =
      typeof defaultValue === "string" &&
      parsedPrinters.data.some((printer) => printer.id === defaultValue)
        ? defaultValue
        : (parsedPrinters.data[0]?.id ?? null);
    const updatedAtValue: unknown = data.updated_at;

    return {
      printers: parsedPrinters.data,
      defaultPrinterId,
      updatedAt:
        typeof updatedAtValue === "string"
          ? updatedAtValue
          : new Date(0).toISOString(),
    };
  }

  async save(settings: PrinterSettingsSnapshot): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("printer_settings")
      .upsert(
        {
          id: SETTINGS_ROW_ID,
          printers: settings.printers,
          default_printer_id: settings.defaultPrinterId,
          updated_at: settings.updatedAt,
        },
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(
        "No se pudo sincronizar la configuración de impresoras. Se conservará en este dispositivo.",
      );
    }
  }
}
