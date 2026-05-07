import { beforeEach, describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { SyncStatusBanner } from "./SyncStatusBanner";
import { useSyncStatusStore } from "../state/syncStatusStore";

describe("SyncStatusBanner", () => {
  beforeEach(() => {
    useSyncStatusStore.getState().reset();
  });

  it("no renderiza nada cuando bannerVariant es none", () => {
    // Arrange — estado inicial tiene bannerVariant="none"

    // Act
    render(<SyncStatusBanner />);

    // Assert
    expect(screen.queryByTestId("sync-status-banner")).toBeNull();
  });

  it("muestra banner local_only con mensaje de modo local activo", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("local-only");

    // Act
    render(<SyncStatusBanner />);

    // Assert
    expect(screen.getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      screen.getByText(
        "Modo local activo. Tus cambios se guardan en este dispositivo.",
      ),
    ).toBeTruthy();
  });

  it("muestra banner offline con mensaje de sin conexion cuando hay pendientes sin red", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("offline");
    useSyncStatusStore.getState().setHasPending(true);

    // Act
    render(<SyncStatusBanner />);

    // Assert
    expect(screen.getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      screen.getByText(
        "Sin conexion. Tus cambios se sincronizaran al reconectar.",
      ),
    ).toBeTruthy();
  });

  it("muestra banner syncing_pending con mensaje de cambios pendientes", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("online");
    useSyncStatusStore.getState().setHasPending(true);

    // Act
    render(<SyncStatusBanner />);

    // Assert
    expect(screen.getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      screen.getByText("Hay cambios pendientes por sincronizar."),
    ).toBeTruthy();
  });

  it("oculta el banner cuando los pendientes se resuelven en cloud+online", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("online");
    useSyncStatusStore.getState().setHasPending(true);

    const { rerender } = render(<SyncStatusBanner />);
    expect(screen.getByTestId("sync-status-banner")).toBeTruthy();

    // Act
    useSyncStatusStore.getState().setHasPending(false);
    rerender(<SyncStatusBanner />);

    // Assert
    expect(screen.queryByTestId("sync-status-banner")).toBeNull();
  });

  it("banner local_only persiste aunque setHasPending(false) sea llamado", () => {
    // Arrange
    useSyncStatusStore.getState().setMode("local-only");
    useSyncStatusStore.getState().setHasPending(false);

    // Act
    render(<SyncStatusBanner />);

    // Assert — local-only always shows
    expect(screen.getByTestId("sync-status-banner")).toBeTruthy();
    expect(
      screen.getByText(
        "Modo local activo. Tus cambios se guardan en este dispositivo.",
      ),
    ).toBeTruthy();
  });

  it("offline sin pendientes no muestra banner", () => {
    // Arrange — offline but hasPending=false → bannerVariant="none"
    useSyncStatusStore.getState().setMode("cloud");
    useSyncStatusStore.getState().setConnectivity("offline");
    useSyncStatusStore.getState().setHasPending(false);

    // Act
    render(<SyncStatusBanner />);

    // Assert
    expect(screen.queryByTestId("sync-status-banner")).toBeNull();
  });
});
