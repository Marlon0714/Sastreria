import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { z } from "zod";

import { generateDomainUuid } from "../../features/clients/domain/types";
import { getDefaultPrinterSettingsRepository } from "../../data/supabase/printerSettingsDependencies";
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
  type PrinterSettingsSnapshot,
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
  remoteSyncStatus: "synced" | "pending" | "error";
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  addPrinter: (input: CreatePrinterConfigInput) => Promise<PrinterTarget>;
  updatePrinter: (id: string, input: CreatePrinterConfigInput) => Promise<void>;
  updateConnection: (id: string, host: string) => Promise<void>;
  setDefaultPrinter: (id: string) => Promise<void>;
  updateProtocol: (id: string, protocol: PrintProtocol) => Promise<void>;
  removePrinter: (id: string) => Promise<void>;
};

function serialize(
  settings: PrinterSettingsSnapshot,
  remoteSyncStatus: "synced" | "pending",
): string {
  return JSON.stringify({ version: 2, ...settings, remoteSyncStatus });
}

function deserialize(
  raw: string,
): {
  settings: PrinterSettingsSnapshot;
  remoteSyncStatus: "synced" | "pending";
} {
  const parsed: unknown = JSON.parse(raw);
  const stored = Array.isArray(parsed)
    ? {
        version: 1,
        printers: parsed,
        defaultPrinterId: null,
        updatedAt: new Date(0).toISOString(),
      }
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
  if (
    !("version" in stored) ||
    (stored.version !== 1 && stored.version !== 2)
  ) {
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
  const updatedAt =
    "updatedAt" in stored && typeof stored.updatedAt === "string"
      ? stored.updatedAt
      : new Date(0).toISOString();
  const remoteSyncStatus =
    "remoteSyncStatus" in stored && stored.remoteSyncStatus === "synced"
      ? "synced"
      : "pending";
  return {
    settings: { printers, defaultPrinterId, updatedAt },
    remoteSyncStatus,
  };
}

/**
 * La copia local se escribe antes de intentar sincronizar con Supabase. Así,
 * un fallo de red nunca bloquea la impresión ni descarta una edición del dueño.
 */
export const usePrinterSettingsStore = create<PrinterSettingsStore>(
  (set, get) => {
    const persistSettings = async (
      printers: PrinterTarget[],
      defaultPrinterId: string | null,
    ): Promise<void> => {
      const settings: PrinterSettingsSnapshot = {
        printers,
        defaultPrinterId,
        updatedAt: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(
        PRINTER_SETTINGS_STORAGE_KEY,
        serialize(settings, "pending"),
      );
      set({
        printers,
        defaultPrinterId,
        remoteSyncStatus: "pending",
        loadError: null,
      });

      try {
        await getDefaultPrinterSettingsRepository().save(settings);
        set({ remoteSyncStatus: "synced", loadError: null });
        try {
          await SecureStore.setItemAsync(
            PRINTER_SETTINGS_STORAGE_KEY,
            serialize(settings, "synced"),
          );
        } catch {
          // La edición ya está guardada; solo se reintentará marcarla synced.
        }
      } catch {
        set({
          remoteSyncStatus: "error",
          loadError:
            "Configuración guardada en este dispositivo. Se sincronizará al recuperar la conexión.",
        });
        console.error(
          JSON.stringify({
            level: "error",
            service: "printerSettingsStore",
            message: "No se pudo sincronizar la configuración de impresoras",
          }),
        );
      }
    };

    return {
        printers: [],
        defaultPrinterId: null,
        loadError: null,
        remoteSyncStatus: "pending",
        isHydrating: false,
        hydrate: async () => {
          set({ isHydrating: true });
          let cached: ReturnType<typeof deserialize> | null = null;
          try {
            const raw = await SecureStore.getItemAsync(
              PRINTER_SETTINGS_STORAGE_KEY,
            );
            if (raw != null) {
              cached = deserialize(raw);
              set({
                printers: cached.settings.printers,
                defaultPrinterId: cached.settings.defaultPrinterId,
                remoteSyncStatus: cached.remoteSyncStatus,
                loadError: null,
              });
            }
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
          try {
            const remote = await getDefaultPrinterSettingsRepository().load();
            if (!remote) {
              if (cached?.remoteSyncStatus === "pending") {
                await getDefaultPrinterSettingsRepository().save(cached.settings);
                await SecureStore.setItemAsync(
                  PRINTER_SETTINGS_STORAGE_KEY,
                  serialize(cached.settings, "synced"),
                );
                set({ remoteSyncStatus: "synced", loadError: null });
              } else if (!cached) {
                set({ remoteSyncStatus: "synced", loadError: null });
              }
              return;
            }

            let selected = remote;
            if (
              cached !== null &&
              cached.remoteSyncStatus === "pending" &&
              Date.parse(cached.settings.updatedAt) > Date.parse(remote.updatedAt)
            ) {
              selected = cached.settings;
              await getDefaultPrinterSettingsRepository().save(selected);
            }
            await SecureStore.setItemAsync(
              PRINTER_SETTINGS_STORAGE_KEY,
              serialize(selected, "synced"),
            );
            set({
              printers: selected.printers,
              defaultPrinterId: selected.defaultPrinterId,
              remoteSyncStatus: "synced",
              loadError: null,
            });
          } catch {
            set({
              remoteSyncStatus: "error",
              loadError:
                "No se pudo sincronizar la configuración compartida. Se conserva la última copia local.",
            });
            console.error(
              JSON.stringify({
                level: "error",
                service: "printerSettingsStore",
                message: "Falló la lectura o sincronización de impresoras compartidas",
              }),
            );
          } finally {
            set({ isHydrating: false });
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
          await persistSettings(nextPrinters, defaultPrinterId);

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
          await persistSettings(nextPrinters, get().defaultPrinterId);
        },
        updateConnection: async (id, host) => {
          assertPrinterAccess(true);
          const result = recoveryHostSchema.safeParse(host.trim());
          if (!result.success) {
            throw new PrinterSettingsValidationError(
              result.error.issues[0]?.message ?? "Dirección inválida.",
            );
          }
          if (!get().printers.some((printer) => printer.id === id)) {
            throw new PrinterSettingsValidationError(
              "La impresora ya no está configurada.",
            );
          }
          const nextPrinters = get().printers.map((printer) =>
            printer.id === id ? { ...printer, host: result.data } : printer,
          );
          await persistSettings(nextPrinters, get().defaultPrinterId);
        },
        setDefaultPrinter: async (id) => {
          assertPrinterAccess(true);
          if (!get().printers.some((printer) => printer.id === id)) {
            throw new PrinterSettingsValidationError(
              "La impresora ya no está configurada.",
            );
          }
          await persistSettings(get().printers, id);
        },
        updateProtocol: async (id, protocol) => {
          const printer = get().printers.find((entry) => entry.id === id);
          if (!printer) {
            throw new PrinterSettingsValidationError(
              "La impresora ya no está configurada.",
            );
          }
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
          await persistSettings(nextPrinters, defaultPrinterId);
        },
      };
  },
);
