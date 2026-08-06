import type { ScheduleEventRepository } from "../../features/schedule/domain/eventRepository";

import { scheduleSyncRun } from "./clientsDependencies";

export function getDefaultScheduleEventRepository(): ScheduleEventRepository {
  const { ScheduleEventRepositoryImpl } =
    // Lazy load avoids pulling SQLite/Expo internals in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./ScheduleEventRepositoryImpl") as typeof import("./ScheduleEventRepositoryImpl");

  // No se cachea instancia, mismo patrón que scheduleDependencies.ts.
  return new ScheduleEventRepositoryImpl({ onWriteCommitted: scheduleSyncRun });
}
