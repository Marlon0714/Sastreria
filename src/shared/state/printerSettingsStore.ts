import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { generateDomainUuid } from "../../features/clients/domain/types";
import {
  PrinterConfigValidationError,
  parsePrinterConfigInput,
  type CreatePrinterConfigInput,
} from "../../features/printing/domain/printerConfig";
import { DEFAULT_PRINT_PROTOCOL } from "../../features/printing/domain/printRenderer";
import type { PrinterTarget } from "../../features/printing/domain/types";

const PRINTER_SETTINGS_STORAGE_KEY = "sastreria_printer_targets";

/**
 * Violación de una regla de negocio esperada al validar el input del
 * formulario (ej. puerto fuera de rango) — su mensaje ya está listo para
 * mostrarse tal cual al usuario, igual que `ScheduleValidationError`.
 */
export class PrinterSettingsValidationError extends Error {}

type PrinterSettingsStore = {
  printers: PrinterTarget[];
  hydrate: () => Promise<void>;
  addPrinter: (input: CreatePrinterConfigInput) => Promise<PrinterTarget>;
  removePrinter: (id: string) => Promise<void>;
};

function serialize(printers: PrinterTarget[]): string {
  return JSON.stringify(printers);
}

function deserialize(raw: string): PrinterTarget[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return (parsed as PrinterTarget[]).map((entry) => ({
    ...entry,
    protocol: entry.protocol ?? DEFAULT_PRINT_PROTOCOL,
  }));
}

/**
 * Impresoras térmicas configuradas por el dueño (config local, NO sincronizada
 * con Supabase — ver `PrinterTarget`). Persistida en `expo-secure-store`, igual
 * patrón que `debugModeStore`. Cada dispositivo mantiene su propia lista.
 */
export const usePrinterSettingsStore = create<PrinterSettingsStore>((set, get) => ({
  printers: [],
  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(PRINTER_SETTINGS_STORAGE_KEY);
    if (raw == null) {
      return;
    }
    try {
      set({ printers: deserialize(raw) });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "printerSettingsStore",
          message: "No se pudo leer la configuración de impresoras guardada",
          error: String(error),
        }),
      );
    }
  },
  addPrinter: async (input) => {
    let parsed;
    try {
      parsed = parsePrinterConfigInput(input);
    } catch (error) {
      if (error instanceof PrinterConfigValidationError) {
        throw new PrinterSettingsValidationError(error.message);
      }
      throw error;
    }

    const printer: PrinterTarget = {
      id: generateDomainUuid(),
      name: parsed.name,
      host: parsed.host,
      port: parsed.port,
      protocol: DEFAULT_PRINT_PROTOCOL,
    };

    const nextPrinters = [...get().printers, printer];
    await SecureStore.setItemAsync(PRINTER_SETTINGS_STORAGE_KEY, serialize(nextPrinters));
    set({ printers: nextPrinters });

    return printer;
  },
  removePrinter: async (id) => {
    const nextPrinters = get().printers.filter((printer) => printer.id !== id);
    await SecureStore.setItemAsync(PRINTER_SETTINGS_STORAGE_KEY, serialize(nextPrinters));
    set({ printers: nextPrinters });
  },
}));
