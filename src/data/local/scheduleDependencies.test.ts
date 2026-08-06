import { describe, expect, it, jest } from "@jest/globals";

interface WriteCommittedOptions {
  onWriteCommitted?: () => void | Promise<void>;
}

describe("scheduleDependencies", () => {
  it("inyecta scheduleSyncRun de clientsDependencies como onWriteCommitted", () => {
    const scheduleSyncRunMock = jest.fn();
    const scheduleRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => unknown>()
      .mockImplementation(() => ({}));

    jest.doMock("./clientsDependencies", () => ({
      scheduleSyncRun: scheduleSyncRunMock,
    }));
    jest.doMock("./ScheduleRepositoryImpl", () => ({
      ScheduleRepositoryImpl: scheduleRepositoryCtor,
    }));

    let onWriteCommitted: (() => void | Promise<void>) | undefined;

    jest.isolateModules(() => {
      const scheduleDependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./scheduleDependencies") as typeof import("./scheduleDependencies");
      scheduleDependenciesModule.getDefaultScheduleRepository();

      onWriteCommitted = (
        scheduleRepositoryCtor.mock.calls[0]?.[0] as
          | WriteCommittedOptions
          | undefined
      )?.onWriteCommitted;
    });

    expect(scheduleRepositoryCtor).toHaveBeenCalledTimes(1);
    expect(onWriteCommitted).toBe(scheduleSyncRunMock);
  });

  it("no cachea instancia: cada llamada construye un repositorio nuevo", () => {
    const scheduleRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => unknown>()
      .mockImplementation(() => ({}));

    jest.doMock("./clientsDependencies", () => ({
      scheduleSyncRun: jest.fn(),
    }));
    jest.doMock("./ScheduleRepositoryImpl", () => ({
      ScheduleRepositoryImpl: scheduleRepositoryCtor,
    }));

    jest.isolateModules(() => {
      const scheduleDependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./scheduleDependencies") as typeof import("./scheduleDependencies");
      scheduleDependenciesModule.getDefaultScheduleRepository();
      scheduleDependenciesModule.getDefaultScheduleRepository();
    });

    expect(scheduleRepositoryCtor).toHaveBeenCalledTimes(2);
  });
});
