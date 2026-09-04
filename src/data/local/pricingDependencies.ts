import type { PricingServiceRepository } from "../../features/pricing/domain/repository";

import { scheduleSyncRun } from "./clientsDependencies";

export function getDefaultPricingServiceRepository(): PricingServiceRepository {
  const { PricingServiceRepositoryImpl } =
    // Lazy load avoids pulling SQLite/Expo internals in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./PricingServiceRepositoryImpl") as typeof import("./PricingServiceRepositoryImpl");

  // No se cachea instancia (a diferencia de getDefaultClientRepository en
  // clientsDependencies.ts): los hooks de pricing mockean la clase por test
  // y esperan una instancia nueva en cada llamada.
  return new PricingServiceRepositoryImpl({ onWriteCommitted: scheduleSyncRun });
}
