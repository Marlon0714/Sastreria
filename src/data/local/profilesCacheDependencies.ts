import type { ProfilesCacheRepository } from "../../features/auth/domain/profilesCacheRepository";

export function getDefaultProfilesCacheRepository(): ProfilesCacheRepository {
  const { ProfilesCacheRepositoryImpl } =
    // Lazy load avoids pulling SQLite/Expo internals in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./ProfilesCacheRepositoryImpl") as typeof import("./ProfilesCacheRepositoryImpl");

  return new ProfilesCacheRepositoryImpl();
}
