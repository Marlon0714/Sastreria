import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { z } from "zod";

import { generateDomainUuid } from "../../features/clients/domain/types";
import {
  PrinterConfigValidationError,
  parsePrinterConfigInput,
  printerConfigSchema,
  recoveryHostSchema,
  type CreatePrinterConfigInput,
} from "../../features/printing/domain/printerConfig";
import { useIdentityStore } from "./identityStore";
import {
  DEFAULT_LABEL_LENGTH_MM,
  DEFAULT_LABEL_WIDTH_MM,
  type PrintProtocol,
  type PrinterTarget,
} from "../../features/printing/domain/types";

const PRINTER_SETTINGS_STORAGE_KEY = "sastreria_printer_targets";

/**
 * Violación de una regla de negocio esperada al validar el input del
 * formulario (ej. puerto fuera de rango) — su mensaje ya está listo para
 * mostrarse tal cual al usuario, igual que `ScheduleValidationError`.
 */
export class PrinterSettingsValidationError extends Error {}

function assertPrinterAccess(ownerOnly: boolean): void {
  const { ownProfile, resolvedActor } = useIdentityStore.getState();
  const actor = ownProfile?.isSharedDevice
    ? (resolvedActor ?? (ownerOnly ? null : ownProfile))
    : ownProfile;
  if (!actor || (ownerOnly && actor.role !== "owner")) {
    throw new PrinterSettingsValidationError(
      "No tienes permiso para cambiar esta configuración.",
    );
  }
}

type PrinterSettingsStore = {
  printers: PrinterTarget[];
  defaultPrinterId: string | null;
  loadError: string | null;
  hydrate: () => Promise<void>;
  addPrinter: (input: CreatePrinterConfigInput) => Promise<PrinterTarget>;
  updatePrinter: (id: string, input: CreatePrinterConfigInput) => Promise<void>;
  updateConnection: (id: string, host: string) => Promise<void>;
  setDefaultPrinter: (id: string) => Promise<void>;
  updateProtocol: (id: string, protocol: PrintProtocol) => Promise<void>;
  removePrinter: (id: string) => Promise<void>;
};

function serialize(
  printers: PrinterTarget[],
  defaultPrinterId: string | null,
): string {
  return JSON.stringify({ version: 1, printers, defaultPrinterId });
}

function deserialize(
  raw: string,
): Pick<PrinterSettingsStore, "printers" | "defaultPrinterId"> {
  const parsed: unknown = JSON.parse(raw);
  const stored = Array.isArray(parsed)
    ? { version: 1, printers: parsed, defaultPrinterId: null }
    : parsed;
  if (
    !stored ||
    typeof stored !== "object" ||
    !("printers" in stored) ||
    !Array.isArray(stored.printers)
  ) {
    throw new PrinterSettingsValidationError(
      "Configuración de impresoras inválida.",
    );
  }
  if (!("version" in stored) || stored.version !== 1) {
    throw new PrinterSettingsValidationError(
      "Versión de configuración no soportada.",
    );
  }
  const printers = stored.printers.map((entry: unknown): PrinterTarget => {
    const parsedEntry = printerConfigSchema
      .extend({ id: z.string().min(1) })
      .parse(entry);
    return {
      ...parsedEntry,
      labelWidthMm: parsedEntry.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
      labelLengthMm: parsedEntry.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM,
    };
  });
  const storedDefault =
    "defaultPrinterId" in stored ? stored.defaultPrinterId : null;
  const defaultPrinterId = printers.some(
    (printer) => printer.id === storedDefault,
  )
    ? (storedDefault as string)
    : (printers[0]?.id ?? null);
  return { printers, defaultPrinterId };
}

/**
 * Impresoras térmicas configuradas por el dueño (config local, NO sincronizada
 * con Supabase — ver `PrinterTarget`). Persistida en `expo-secure-store`, igual
 * patrón que `debugModeStore`. Cada dispositivo mantiene su propia lista.
 */
export const usePrinterSettingsStore = create<PrinterSettingsStore>(
  (set, get) => ({
    printers: [],
    defaultPrinterId: null,
    loadError: null,
    hydrate: async () => {
      try {
        const raw = await SecureStore.getItemAsync(
          PRINTER_SETTINGS_STORAGE_KEY,
        );
        if (raw == null) {
          set({ loadError: null });
          return;
        }
        set({ ...deserialize(raw), loadError: null });
      } catch (error) {
        set({
          loadError:
            "No se pudo leer la configuración de impresoras de este dispositivo.",
        });
        console.error(
          JSON.stringify({
            level: "error",
            service: "printerSettingsStore",
            message: "No se pudo leer la configuración de impresoras guardada",
            errorCode:
              error instanceof PrinterSettingsValidationError
                ? "invalid_configuration"
                : "configuration_read_failed",
          }),
        );
      }
    },
    addPrinter: async (input) => {
      assertPrinterAccess(true);
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
        protocol: parsed.protocol,
        labelWidthMm: parsed.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
        labelLengthMm: parsed.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM,
      };

      const nextPrinters = [...get().printers, printer];
      const defaultPrinterId = get().defaultPrinterId ?? printer.id;
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(nextPrinters, defaultPrinterId),
      );
      set({ printers: nextPrinters, defaultPrinterId, loadError: null });

      return printer;
    },
    updatePrinter: async (id, input) => {
      assertPrinterAccess(true);
      const parsed = parsePrinterConfigInput(input);
      if (!get().printers.some((printer) => printer.id === id)) {
        throw new PrinterSettingsValidationError(
          "La impresora ya no está configurada.",
        );
      }
      const nextPrinters = get().printers.map((printer) =>
        printer.id === id
          ? {
              ...printer,
              ...parsed,
              labelWidthMm: parsed.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
              labelLengthMm: parsed.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM,
            }
          : printer,
      );
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(nextPrinters, get().defaultPrinterId),
      );
      set({ printers: nextPrinters, loadError: null });
    },
    updateConnection: async (id, host) => {
      assertPrinterAccess(false);
      const result = recoveryHostSchema.safeParse(host.trim());
      if (!result.success)
        throw new PrinterSettingsValidationError(
          result.error.issues[0]?.message ?? "Dirección inválida.",
        );
      if (!get().printers.some((printer) => printer.id === id))
        throw new PrinterSettingsValidationError(
          "La impresora ya no está configurada.",
        );
      const nextPrinters = get().printers.map((printer) =>
        printer.id === id ? { ...printer, host: result.data } : printer,
      );
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(nextPrinters, get().defaultPrinterId),
      );
      set({ printers: nextPrinters, loadError: null });
    },
    setDefaultPrinter: async (id) => {
      assertPrinterAccess(false);
      if (!get().printers.some((printer) => printer.id === id)) {
        throw new PrinterSettingsValidationError(
          "La impresora ya no está configurada.",
        );
      }
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(get().printers, id),
      );
      set({ defaultPrinterId: id });
    },
    updateProtocol: async (id, protocol) => {
      const printer = get().printers.find((entry) => entry.id === id);
      if (!printer)
        throw new PrinterSettingsValidationError(
          "La impresora ya no está configurada.",
        );
      await get().updatePrinter(id, { ...printer, protocol });
    },
    removePrinter: async (id) => {
      assertPrinterAccess(true);
      const nextPrinters = get().printers.filter(
        (printer) => printer.id !== id,
      );
      const defaultPrinterId =
        get().defaultPrinterId === id
          ? (nextPrinters[0]?.id ?? null)
          : get().defaultPrinterId;
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(nextPrinters, defaultPrinterId),
      );
      set({ printers: nextPrinters, defaultPrinterId });
    },
  }),
);
