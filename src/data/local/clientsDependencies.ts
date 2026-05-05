import type {
  ClientRepository,
  ClientsDependencies,
  ClientsDependenciesOverrides,
  MeasurementRepository,
} from "../../features/clients/domain/repository";
import type { SyncOrchestrator } from "../sync";

let defaultClientRepository: ClientRepository | null = null;
let defaultMeasurementRepository: MeasurementRepository | null = null;
let defaultSyncOrchestrator: SyncOrchestrator | null = null;

function scheduleSyncRun(): void {
  void getClientsSyncOrchestrator()
    .requestRun("write")
    .catch((err: unknown) => {
      // TODO: replace with Crashlytics when telemetry is integrated
      console.error(
        JSON.stringify({
          level: "error",
          service: "clientsDependencies",
          message: "Sync run failed",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
}

function getClientsSyncOrchestrator(): SyncOrchestrator {
  if (defaultSyncOrchestrator) {
    return defaultSyncOrchestrator;
  }

  const { SyncQueueProcessor, SyncQueueRepository, SyncOrchestrator } =
    // Lazy load avoids pulling SQLite/Expo internals in unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../sync") as typeof import("../sync");

  const { isSupabaseConfigured } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../supabase/config") as typeof import("../supabase/config");

  let transport: import("../sync").SyncTransport;

  if (isSupabaseConfigured()) {
    const { SupabaseSyncTransport } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../sync/SupabaseSyncTransport") as typeof import("../sync/SupabaseSyncTransport");
    transport = new SupabaseSyncTransport();
  } else {
    const { NoopSyncTransport } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../sync") as typeof import("../sync");
    transport = new NoopSyncTransport();
  }

  const queueRepository = new SyncQueueRepository();
  const processor = new SyncQueueProcessor(queueRepository, transport);

  defaultSyncOrchestrator = new SyncOrchestrator(processor);
  return defaultSyncOrchestrator;
}

function getDefaultClientRepository(): ClientRepository {
  if (defaultClientRepository) {
    return defaultClientRepository;
  }

  const { ClientRepositoryImpl } =
    // Lazy load avoids pulling SQLite in unit tests that inject fakes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./ClientRepositoryImpl") as typeof import("./ClientRepositoryImpl");

  defaultClientRepository = new ClientRepositoryImpl({
    onWriteCommitted: scheduleSyncRun,
  });
  return defaultClientRepository;
}

function getDefaultMeasurementRepository(): MeasurementRepository {
  if (defaultMeasurementRepository) {
    return defaultMeasurementRepository;
  }

  const { MeasurementRepositoryImpl } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./MeasurementRepositoryImpl") as typeof import("./MeasurementRepositoryImpl");

  defaultMeasurementRepository = new MeasurementRepositoryImpl({
    onWriteCommitted: scheduleSyncRun,
  });
  return defaultMeasurementRepository;
}

export { getClientsSyncOrchestrator };

export function resolveClientRepository(
  repository?: ClientRepository,
): ClientRepository {
  return repository ?? getDefaultClientRepository();
}

export function resolveMeasurementRepository(
  repository?: MeasurementRepository,
): MeasurementRepository {
  return repository ?? getDefaultMeasurementRepository();
}

export function getClientsDependencies(): ClientsDependencies {
  return {
    clientRepository: getDefaultClientRepository(),
    measurementRepository: getDefaultMeasurementRepository(),
  };
}

export function createClientsDependencies(
  overrides: ClientsDependenciesOverrides = {},
): ClientsDependencies {
  return {
    clientRepository: resolveClientRepository(overrides.clientRepository),
    measurementRepository: resolveMeasurementRepository(
      overrides.measurementRepository,
    ),
  };
}
