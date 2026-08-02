import { describe, expect, it, jest } from "@jest/globals";

interface WriteCommittedOptions {
  onWriteCommitted?: () => void | Promise<void>;
}

describe("pricingDependencies", () => {
  it("inyecta scheduleSyncRun de clientsDependencies como onWriteCommitted", () => {
    const scheduleSyncRunMock = jest.fn();
    const pricingRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => unknown>()
      .mockImplementation(() => ({}));

    jest.doMock("./clientsDependencies", () => ({
      scheduleSyncRun: scheduleSyncRunMock,
    }));
    jest.doMock("./PricingServiceRepositoryImpl", () => ({
      PricingServiceRepositoryImpl: pricingRepositoryCtor,
    }));

    let onWriteCommitted: (() => void | Promise<void>) | undefined;

    jest.isolateModules(() => {
      const pricingDependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./pricingDependencies") as typeof import("./pricingDependencies");
      pricingDependenciesModule.getDefaultPricingServiceRepository();

      onWriteCommitted = (
        pricingRepositoryCtor.mock.calls[0]?.[0] as
          | WriteCommittedOptions
          | undefined
      )?.onWriteCommitted;
    });

    expect(pricingRepositoryCtor).toHaveBeenCalledTimes(1);
    expect(onWriteCommitted).toBe(scheduleSyncRunMock);
  });

  it("no cachea instancia: cada llamada construye un repositorio nuevo", () => {
    const pricingRepositoryCtor = jest
      .fn<(options?: WriteCommittedOptions) => unknown>()
      .mockImplementation(() => ({}));

    jest.doMock("./clientsDependencies", () => ({
      scheduleSyncRun: jest.fn(),
    }));
    jest.doMock("./PricingServiceRepositoryImpl", () => ({
      PricingServiceRepositoryImpl: pricingRepositoryCtor,
    }));

    jest.isolateModules(() => {
      const pricingDependenciesModule =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./pricingDependencies") as typeof import("./pricingDependencies");
      pricingDependenciesModule.getDefaultPricingServiceRepository();
      pricingDependenciesModule.getDefaultPricingServiceRepository();
    });

    expect(pricingRepositoryCtor).toHaveBeenCalledTimes(2);
  });
});
