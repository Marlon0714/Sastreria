import type { ScheduleRepository } from "../../features/schedule/domain/repository";

import { scheduleSyncRun } from "./clientsDependencies";

export function getDefaultScheduleRepository(): ScheduleRepository {
  const { ScheduleRepositoryImpl } =
    // Lazy load avoids pulling SQLite/Expo internals in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./ScheduleRepositoryImpl") as typeof import("./ScheduleRepositoryImpl");

  // No se cachea instancia (mismo patrón que pricingDependencies): los
  // hooks de schedule mockean la clase por test y esperan una instancia
  // nueva en cada llamada.
  return new ScheduleRepositoryImpl({ onWriteCommitted: scheduleSyncRun });
}
