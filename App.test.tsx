import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";

import App from "./App";
import type { ClientsDependencies } from "./src/features/clients/domain/repository";

const mockGetDatabase = jest.fn<() => object>();
const mockRunMigrations = jest.fn<(db: object) => Promise<void>>();
const mockGetClientsDependencies = jest.fn<() => ClientsDependencies>();
const mockRequestRun = jest.fn<() => Promise<void>>();

jest.mock("./src/data/local/database", () => ({
  getDatabase: (): object => mockGetDatabase(),
}));

jest.mock("./src/data/local/migrations", () => ({
  runMigrations: (db: object): Promise<void> => mockRunMigrations(db),
}));

jest.mock("./src/data/local/clientsDependencies", () => ({
  getClientsDependencies: (): ClientsDependencies =>
    mockGetClientsDependencies(),
  getClientsSyncOrchestrator: () => ({
    requestRun: (): Promise<void> => mockRequestRun(),
  }),
}));

jest.mock("./src/navigation/RootNavigator", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return function MockRootNavigator() {
    return React.createElement(Text, null, "RootNavigator");
  };
});

function buildDependencies(): ClientsDependencies {
  return {
    clientRepository: {
      create: jest.fn(async () => Promise.reject(new Error("unused"))),
      findAll: jest.fn(async () => Promise.resolve([])),
      findById: jest.fn(async () => Promise.resolve(null)),
    },
    measurementRepository: {
      addMeasurement: jest.fn(async () => Promise.reject(new Error("unused"))),
      findMeasurementsByClientId: jest.fn(async () => Promise.resolve([])),
    },
  };
}

describe("App bootstrap sync trigger", () => {
  beforeEach(() => {
    mockGetDatabase.mockReset();
    mockRunMigrations.mockReset();
    mockGetClientsDependencies.mockReset();
    mockRequestRun.mockReset();

    mockGetDatabase.mockReturnValue({});
    mockGetClientsDependencies.mockReturnValue(buildDependencies());
    mockRunMigrations.mockResolvedValue(undefined);
    mockRequestRun.mockResolvedValue(undefined);
  });

  it("runs migrations, triggers sync request and renders navigator", async () => {
    // Arrange
    render(<App />);

    // Act
    await waitFor(() => {
      expect(screen.getByText("RootNavigator")).toBeTruthy();
    });

    // Assert
    expect(mockRunMigrations).toHaveBeenCalledTimes(1);
    expect(mockRequestRun).toHaveBeenCalledTimes(1);
    expect(mockGetClientsDependencies).toHaveBeenCalledTimes(1);
  });

  it("shows bootstrap error when migrations fail", async () => {
    // Arrange
    mockRunMigrations.mockRejectedValueOnce(new Error("migration failure"));

    // Act
    render(<App />);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("No se pudo inicializar la base de datos local."),
      ).toBeTruthy();
    });
    expect(mockRequestRun).not.toHaveBeenCalled();
  });

  it("does not block UI when initial sync request fails", async () => {
    // Arrange
    mockRequestRun.mockRejectedValueOnce(new Error("sync failure"));

    // Act
    render(<App />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("RootNavigator")).toBeTruthy();
    });
    expect(mockRequestRun).toHaveBeenCalledTimes(1);
  });
});
