import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type {
  ClientRepository,
  MeasurementRepository,
} from "../../features/clients/domain/repository";
import type {
  CamisaMeasurement,
  Client,
  CreateClientDTO,
  PantalonMeasurement,
  UpsertCamisaDTO,
  UpsertPantalonDTO,
} from "../../features/clients/domain/types";

function buildClientRepositoryContract(): ClientRepository {
  return {
    create: jest.fn(
      async (_input: CreateClientDTO): Promise<Client> =>
        Promise.reject(new Error("not implemented")),
    ),
    findAll: jest.fn(async (): Promise<Client[]> => Promise.resolve([])),
    findById: jest.fn(
      async (_id: string): Promise<Client | null> => Promise.resolve(null),
    ),
  };
}

function buildMeasurementRepositoryContract(): MeasurementRepository {
  return {
    upsertCamisa: jest.fn(
      async (_input: UpsertCamisaDTO): Promise<CamisaMeasurement> =>
        Promise.reject(new Error("not implemented")),
    ),
    upsertPantalon: jest.fn(
      async (_input: UpsertPantalonDTO): Promise<PantalonMeasurement> =>
        Promise.reject(new Error("not implemented")),
    ),
    findCamisaByClientId: jest.fn(
      async (_clientId: string): Promise<CamisaMeasurement | null> =>
        Promise.resolve(null),
    ),
    findPantalonByClientId: jest.fn(
      async (_clientId: string): Promise<PantalonMeasurement | null> =>
        Promise.resolve(null),
    ),
  };
}

describe("clientsDependencies", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("resuelve repositorios default y reutiliza singletons", () => {
    // Arrange
    const defaultClientRepository = buildClientRepositoryContract();
    const defaultMeasurementRepository = buildMeasurementRepositoryContract();
    const clientRepositoryCtor = jest
      .fn()
      .mockImplementation(() => defaultClientRepository);
    const measurementRepositoryCtor = jest
      .fn()
      .mockImplementation(() => defaultMeasurementRepository);

    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));
    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    // Act
    let firstDependencies:
      | {
          clientRepository: ClientRepository;
          measurementRepository: MeasurementRepository;
        }
      | undefined;
    let secondDependencies:
      | {
          clientRepository: ClientRepository;
          measurementRepository: MeasurementRepository;
        }
      | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");
      firstDependencies = dependenciesModule.getClientsDependencies();
      secondDependencies = dependenciesModule.getClientsDependencies();
    });

    // Assert
    expect(firstDependencies).toBeDefined();
    expect(secondDependencies).toBeDefined();
    expect(firstDependencies?.clientRepository).toBe(defaultClientRepository);
    expect(firstDependencies?.measurementRepository).toBe(
      defaultMeasurementRepository,
    );
    expect(secondDependencies?.clientRepository).toBe(defaultClientRepository);
    expect(secondDependencies?.measurementRepository).toBe(
      defaultMeasurementRepository,
    );
    expect(clientRepositoryCtor).toHaveBeenCalledTimes(1);
    expect(measurementRepositoryCtor).toHaveBeenCalledTimes(1);
  });

  it("permite override completo en createClientsDependencies sin instanciar defaults", () => {
    // Arrange
    const overrideClientRepository = buildClientRepositoryContract();
    const overrideMeasurementRepository = buildMeasurementRepositoryContract();
    const clientRepositoryCtor = jest.fn().mockImplementation(() => {
      throw new Error("default client repository should not be created");
    });
    const measurementRepositoryCtor = jest.fn().mockImplementation(() => {
      throw new Error("default measurement repository should not be created");
    });

    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));
    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    // Act
    let dependencies:
      | {
          clientRepository: ClientRepository;
          measurementRepository: MeasurementRepository;
        }
      | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");
      dependencies = dependenciesModule.createClientsDependencies({
        clientRepository: overrideClientRepository,
        measurementRepository: overrideMeasurementRepository,
      });
    });

    // Assert
    expect(dependencies?.clientRepository).toBe(overrideClientRepository);
    expect(dependencies?.measurementRepository).toBe(
      overrideMeasurementRepository,
    );
    expect(clientRepositoryCtor).not.toHaveBeenCalled();
    expect(measurementRepositoryCtor).not.toHaveBeenCalled();
  });

  it("permite override parcial y usa default para la dependencia faltante", () => {
    // Arrange
    const overrideClientRepository = buildClientRepositoryContract();
    const defaultMeasurementRepository = buildMeasurementRepositoryContract();
    const clientRepositoryCtor = jest.fn().mockImplementation(() => {
      throw new Error("default client repository should not be created");
    });
    const measurementRepositoryCtor = jest
      .fn()
      .mockImplementation(() => defaultMeasurementRepository);

    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));
    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    // Act
    let dependencies:
      | {
          clientRepository: ClientRepository;
          measurementRepository: MeasurementRepository;
        }
      | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");
      dependencies = dependenciesModule.createClientsDependencies({
        clientRepository: overrideClientRepository,
      });
    });

    // Assert
    expect(dependencies?.clientRepository).toBe(overrideClientRepository);
    expect(dependencies?.measurementRepository).toBe(
      defaultMeasurementRepository,
    );
    expect(clientRepositoryCtor).not.toHaveBeenCalled();
    expect(measurementRepositoryCtor).toHaveBeenCalledTimes(1);
  });

  it("resuelve override de clientRepository por contrato", () => {
    // Arrange
    const overrideClientRepository = buildClientRepositoryContract();
    const defaultClientRepository = buildClientRepositoryContract();
    const clientRepositoryCtor = jest
      .fn()
      .mockImplementation(() => defaultClientRepository);

    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));

    // Act
    let resolvedClientRepository: ClientRepository | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");
      resolvedClientRepository = dependenciesModule.resolveClientRepository(
        overrideClientRepository,
      );
    });

    // Assert
    expect(resolvedClientRepository).toBe(overrideClientRepository);
    expect(clientRepositoryCtor).not.toHaveBeenCalled();
  });

  it("resuelve override de measurementRepository por contrato", () => {
    // Arrange
    const overrideMeasurementRepository = buildMeasurementRepositoryContract();
    const defaultMeasurementRepository = buildMeasurementRepositoryContract();
    const measurementRepositoryCtor = jest
      .fn()
      .mockImplementation(() => defaultMeasurementRepository);

    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    // Act
    let resolvedMeasurementRepository: MeasurementRepository | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");
      resolvedMeasurementRepository =
        dependenciesModule.resolveMeasurementRepository(
          overrideMeasurementRepository,
        );
    });

    // Assert
    expect(resolvedMeasurementRepository).toBe(overrideMeasurementRepository);
    expect(measurementRepositoryCtor).not.toHaveBeenCalled();
  });

  it("wires repositories to trigger sync orchestrator after local write commits", async () => {
    interface WriteCommittedOptions {
      onWriteCommitted?: () => void | Promise<void>;
    }

    const requestRun = jest.fn(async () => Promise.resolve());
    const syncOrchestratorInstance = { requestRun };
    const syncOrchestratorCtor = jest
      .fn()
      .mockImplementation(() => syncOrchestratorInstance);
    const syncQueueRepositoryCtor = jest.fn().mockImplementation(() => ({}));
    const syncQueueProcessorCtor = jest.fn().mockImplementation(() => ({}));
    const noopSyncTransportCtor = jest.fn().mockImplementation(() => ({}));

    const defaultClientRepository = buildClientRepositoryContract();
    const defaultMeasurementRepository = buildMeasurementRepositoryContract();

    const clientRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => ClientRepository>()
      .mockImplementation(() => defaultClientRepository);
    const measurementRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => MeasurementRepository>()
      .mockImplementation(() => defaultMeasurementRepository);

    jest.doMock("../sync", () => ({
      SyncOrchestrator: syncOrchestratorCtor,
      SyncQueueRepository: syncQueueRepositoryCtor,
      SyncQueueProcessor: syncQueueProcessorCtor,
      NoopSyncTransport: noopSyncTransportCtor,
    }));
    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));
    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    let clientOnWriteCommitted: (() => void | Promise<void>) | undefined;
    let measurementOnWriteCommitted: (() => void | Promise<void>) | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");

      dependenciesModule.getClientsDependencies();

      clientOnWriteCommitted = (
        clientRepositoryCtor.mock.calls[0]?.[0] as
          | WriteCommittedOptions
          | undefined
      )?.onWriteCommitted;
      measurementOnWriteCommitted = (
        measurementRepositoryCtor.mock.calls[0]?.[0] as
          | WriteCommittedOptions
          | undefined
      )?.onWriteCommitted;
    });

    expect(clientOnWriteCommitted).toBeDefined();
    expect(measurementOnWriteCommitted).toBeDefined();

    await Promise.resolve(clientOnWriteCommitted?.());
    await Promise.resolve(measurementOnWriteCommitted?.());

    expect(syncQueueRepositoryCtor).toHaveBeenCalledTimes(1);
    expect(noopSyncTransportCtor).toHaveBeenCalledTimes(1);
    expect(syncQueueProcessorCtor).toHaveBeenCalledTimes(1);
    expect(syncOrchestratorCtor).toHaveBeenCalledTimes(1);
    expect(requestRun).toHaveBeenCalledTimes(2);
  });

  it("swallows sync request failures triggered by write callbacks", async () => {
    interface WriteCommittedOptions {
      onWriteCommitted?: () => void | Promise<void>;
    }

    const requestRun = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("sync down"));
    const syncOrchestratorCtor = jest
      .fn()
      .mockImplementation(() => ({ requestRun }));

    const clientRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => ClientRepository>()
      .mockImplementation(() => buildClientRepositoryContract());
    const measurementRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => MeasurementRepository>()
      .mockImplementation(() => buildMeasurementRepositoryContract());

    jest.doMock("../sync", () => ({
      SyncOrchestrator: syncOrchestratorCtor,
      SyncQueueRepository: jest.fn().mockImplementation(() => ({})),
      SyncQueueProcessor: jest.fn().mockImplementation(() => ({})),
      NoopSyncTransport: jest.fn().mockImplementation(() => ({})),
    }));
    jest.doMock("./ClientRepositoryImpl", () => ({
      ClientRepositoryImpl: clientRepositoryCtor,
    }));
    jest.doMock("./MeasurementRepositoryImpl", () => ({
      MeasurementRepositoryImpl: measurementRepositoryCtor,
    }));

    let clientOnWriteCommitted: (() => void | Promise<void>) | undefined;

    jest.isolateModules(() => {
      const dependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./clientsDependencies") as typeof import("./clientsDependencies");

      dependenciesModule.getClientsDependencies();

      clientOnWriteCommitted = (
        clientRepositoryCtor.mock.calls[0]?.[0] as
          | WriteCommittedOptions
          | undefined
      )?.onWriteCommitted;
    });

    await expect(
      Promise.resolve(clientOnWriteCommitted?.()),
    ).resolves.toBeUndefined();
    await Promise.resolve();
    expect(requestRun).toHaveBeenCalledTimes(1);
  });
});
