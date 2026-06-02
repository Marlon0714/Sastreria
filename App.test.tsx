import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";

import App from "./App";
import type { ClientsDependencies } from "./src/features/clients/domain/repository";
import { useSyncStatusStore } from "./src/shared/state/syncStatusStore";

jest.setTimeout(15000);

const mockGetDatabase = jest.fn<() => object>();
const mockRunMigrations = jest.fn<(db: object) => Promise<void>>();
const mockGetClientsDependencies = jest.fn<() => ClientsDependencies>();
const mockRequestRun = jest.fn<() => Promise<void>>();
const mockPullIncremental = jest.fn<() => Promise<void>>();
const mockRealtimeStart = jest.fn<() => void>();
const mockRealtimeStop = jest.fn<() => Promise<void>>();
const mockLifecycleStart = jest.fn<() => void>();
const mockLifecycleStop = jest.fn<() => void>();
const mockConnectivityStart = jest.fn<() => Promise<void>>();
const mockConnectivityStop = jest.fn<() => void>();
const mockIsSupabaseConfigured = jest.fn<() => boolean>();

jest.mock("./src/data/local/database", () => ({
  getDatabase: (): object => mockGetDatabase(),
}));

jest.mock("./src/data/local/migrations", () => ({
  runMigrations: (db: object): Promise<void> => mockRunMigrations(db),
}));

jest.mock("./src/data/supabase/config", () => ({
  isSupabaseConfigured: (): boolean => mockIsSupabaseConfigured(),
}));

jest.mock("./src/data/local/clientsDependencies", () => ({
  getClientsDependencies: (): ClientsDependencies =>
    mockGetClientsDependencies(),
  getClientsSyncOrchestrator: () => ({
    requestRun: (): Promise<void> => mockRequestRun(),
  }),
}));

jest.mock("./src/data/sync/SupabasePullSync", () => ({
  SupabasePullSync: jest.fn().mockImplementation(() => ({
    pullIncremental: (): Promise<void> => mockPullIncremental(),
  })),
}));

jest.mock("./src/data/sync/SupabaseRealtimeInvalidationSubscriber", () => ({
  SupabaseRealtimeInvalidationSubscriber: jest.fn().mockImplementation(() => ({
    start: (): void => mockRealtimeStart(),
    stop: (): Promise<void> => mockRealtimeStop(),
  })),
}));

jest.mock("./src/data/sync/SyncLifecycleController", () => ({
  SyncLifecycleController: jest.fn().mockImplementation(() => ({
    start: (): void => mockLifecycleStart(),
    stop: (): void => mockLifecycleStop(),
  })),
}));

jest.mock("./src/data/sync/SyncConnectivityController", () => ({
  SyncConnectivityController: jest.fn().mockImplementation(() => ({
    start: (): Promise<void> => mockConnectivityStart(),
    stop: (): void => mockConnectivityStop(),
  })),
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
      update: jest.fn(async () => Promise.reject(new Error("unused"))),
      delete: jest.fn(async () => Promise.resolve()),
    },
    measurementRepository: {
      upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
      upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
      findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
      findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
  upsertSaco: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertChaleco: jest.fn(async () => Promise.reject(new Error("unused"))),
  findSacoByClientId: jest.fn(async () => Promise.resolve(null)),
  findChalecoByClientId: jest.fn(async () => Promise.resolve(null)),
    },
    tallaRepository: {
      upsert: jest.fn(async () => Promise.reject(new Error("unused"))),
      findByClientId: jest.fn(async () => Promise.resolve([])),
      delete: jest.fn(async () => Promise.resolve()),
    },
  };
}

describe("App bootstrap sync trigger", () => {
  beforeEach(() => {
    mockGetDatabase.mockReset();
    mockRunMigrations.mockReset();
    mockGetClientsDependencies.mockReset();
    mockRequestRun.mockReset();
    mockPullIncremental.mockReset();
    mockRealtimeStart.mockReset();
    mockRealtimeStop.mockReset();
    mockLifecycleStart.mockReset();
    mockLifecycleStop.mockReset();
    mockConnectivityStart.mockReset();
    mockConnectivityStop.mockReset();
    mockIsSupabaseConfigured.mockReset();

    mockGetDatabase.mockReturnValue({});
    mockGetClientsDependencies.mockReturnValue(buildDependencies());
    mockRunMigrations.mockResolvedValue(undefined);
    mockRequestRun.mockResolvedValue(undefined);
    mockPullIncremental.mockResolvedValue(undefined);
    mockRealtimeStop.mockResolvedValue(undefined);
    mockConnectivityStart.mockResolvedValue(undefined);
    mockIsSupabaseConfigured.mockReturnValue(true);
  });

  it("runs migrations, triggers sync request and renders navigator", async () => {
    // Arrange
    render(<App />);

    // Act
    await waitFor(
      () => {
        expect(screen.getByText("RootNavigator")).toBeTruthy();
      },
      { timeout: 10000 },
    );

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

  it("starts realtime, lifecycle and connectivity controllers and stops them on unmount", async () => {
    // Arrange
    const rendered = render(<App />);

    // Act
    await waitFor(() => {
      expect(screen.getByText("RootNavigator")).toBeTruthy();
    });
    rendered.unmount();

    // Assert
    expect(mockRealtimeStart).toHaveBeenCalledTimes(1);
    expect(mockLifecycleStart).toHaveBeenCalledTimes(1);
    expect(mockConnectivityStart).toHaveBeenCalledTimes(1);
    expect(mockPullIncremental).toHaveBeenCalledTimes(1);
    expect(mockRealtimeStop).toHaveBeenCalledTimes(1);
    expect(mockLifecycleStop).toHaveBeenCalledTimes(1);
    expect(mockConnectivityStop).toHaveBeenCalledTimes(1);
  });

  it("en modo local-only no inicia realtime ni pull sync y pone modo local-only en el store", async () => {
    // Arrange
    useSyncStatusStore.getState().reset();
    mockIsSupabaseConfigured.mockReturnValue(false);

    // Act
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("RootNavigator")).toBeTruthy();
    });

    // Assert — pull sync no se crea
    expect(mockPullIncremental).not.toHaveBeenCalled();
    expect(mockRealtimeStart).not.toHaveBeenCalled();
    // El store debe reflejar modo local-only
    expect(useSyncStatusStore.getState().mode).toBe("local-only");
    // Lifecycle y connectivity controllers sí se inician (son agnósticos al modo)
    expect(mockLifecycleStart).toHaveBeenCalledTimes(1);
    expect(mockConnectivityStart).toHaveBeenCalledTimes(1);
  });
});
