import type { PrinterSettingsRepository } from "../../features/printing/domain/repository";
import { SupabasePrinterSettingsRepository } from "./SupabasePrinterSettingsRepository";

let defaultRepository: PrinterSettingsRepository | null = null;

export function getDefaultPrinterSettingsRepository(): PrinterSettingsRepository {
  if (!defaultRepository) {
    defaultRepository = new SupabasePrinterSettingsRepository();
  }
  return defaultRepository;
}
