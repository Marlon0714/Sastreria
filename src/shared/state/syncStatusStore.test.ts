import { beforeEach, describe, expect, it } from "@jest/globals";

import { useSyncStatusStore } from "./syncStatusStore";

describe("syncStatusStore", () => {
  beforeEach(() => {
    useSyncStatusStore.getState().reset();
  });

  describe("estado inicial", () => {
    it("tiene modo cloud, conectividad unknown y sin pendientes", () => {
      // Arrange / Act
      const state = useSyncStatusStore.getState();

      // Assert
      expect(state.mode).toBe("cloud");
      expect(state.connectivity).toBe("unknown");
      expect(state.hasPending).toBe(false);
      expect(state.lastSyncAttempt).toBeNull();
      expect(state.lastSyncError).toBeNull();
      expect(state.bannerVariant).toBe("none");
    });
  });

  describe("deriveBannerVariant — modo local-only", () => {
    it("siempre devuelve local_only sin importar conectividad ni pendientes", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act — offline + pending
      store.setMode("local-only");
      store.setConnectivity("offline");
      store.setHasPending(true);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");
    });

    it("mantiene local_only aunque hasPending sea false", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("local-only");
      store.setConnectivity("online");
      store.setHasPending(false);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");
    });

    it("mantiene local_only aunque la conectividad sea online sin pendientes", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("local-only");
      store.setConnectivity("online");
      store.setHasPending(false);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");
    });
  });

  describe("deriveBannerVariant — modo cloud", () => {
    it("devuelve offline cuando hay pendientes y sin conexion", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("cloud");
      store.setConnectivity("offline");
      store.setHasPending(true);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("offline");
    });

    it("devuelve none cuando esta offline pero sin pendientes", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("cloud");
      store.setConnectivity("offline");
      store.setHasPending(false);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("none");
    });

    it("devuelve syncing_pending cuando hay pendientes y conexion online", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("cloud");
      store.setConnectivity("online");
      store.setHasPending(true);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe(
        "syncing_pending",
      );
    });

    it("devuelve none cuando esta online sin pendientes", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("cloud");
      store.setConnectivity("online");
      store.setHasPending(false);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("none");
    });

    it("devuelve syncing_pending cuando conectividad es unknown con pendientes", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setMode("cloud");
      store.setConnectivity("unknown");
      store.setHasPending(true);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe(
        "syncing_pending",
      );
    });
  });

  describe("setMode", () => {
    it("transicion de cloud a local-only actualiza bannerVariant inmediatamente", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setConnectivity("online");
      store.setHasPending(false);
      expect(useSyncStatusStore.getState().bannerVariant).toBe("none");

      // Act
      store.setMode("local-only");

      // Assert
      expect(useSyncStatusStore.getState().mode).toBe("local-only");
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");
    });

    it("transicion de local-only a cloud con pendientes muestra syncing_pending", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("local-only");
      store.setConnectivity("online");
      store.setHasPending(true);
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");

      // Act
      store.setMode("cloud");

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe(
        "syncing_pending",
      );
    });
  });

  describe("setConnectivity", () => {
    it("al pasar a offline con pendientes el banner cambia a offline", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("cloud");
      store.setHasPending(true);

      // Act
      store.setConnectivity("offline");

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("offline");
    });

    it("al recuperar conexion con pendientes el banner vuelve a syncing_pending", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("cloud");
      store.setHasPending(true);
      store.setConnectivity("offline");
      expect(useSyncStatusStore.getState().bannerVariant).toBe("offline");

      // Act
      store.setConnectivity("online");

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe(
        "syncing_pending",
      );
    });
  });

  describe("setHasPending", () => {
    it("al resolver pendientes en cloud+online el banner desaparece", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("cloud");
      store.setConnectivity("online");
      store.setHasPending(true);
      expect(useSyncStatusStore.getState().bannerVariant).toBe(
        "syncing_pending",
      );

      // Act
      store.setHasPending(false);

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("none");
    });

    it("en modo local-only setHasPending no cambia el bannerVariant de local_only", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("local-only");

      // Act
      store.setHasPending(false);

      // Assert — local_only banner persists regardless
      expect(useSyncStatusStore.getState().bannerVariant).toBe("local_only");
    });
  });

  describe("setLastSyncError", () => {
    it("almacena mensaje de error y lo borra al pasar null", () => {
      // Arrange
      const store = useSyncStatusStore.getState();

      // Act
      store.setLastSyncError("Fallo de red");
      expect(useSyncStatusStore.getState().lastSyncError).toBe("Fallo de red");

      store.setLastSyncError(null);
      expect(useSyncStatusStore.getState().lastSyncError).toBeNull();
    });
  });

  describe("setLastSyncAttempt", () => {
    it("almacena el timestamp de ultimo intento", () => {
      // Arrange
      const ts = "2026-05-06T10:00:00.000Z";

      // Act
      useSyncStatusStore.getState().setLastSyncAttempt(ts);

      // Assert
      expect(useSyncStatusStore.getState().lastSyncAttempt).toBe(ts);
    });
  });

  describe("refreshBannerVariant", () => {
    it("re-deriva el variant desde el estado actual sin mutarlo", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("cloud");
      store.setConnectivity("offline");
      store.setHasPending(true);
      expect(useSyncStatusStore.getState().bannerVariant).toBe("offline");

      // Act — llamar refresh no debe cambiar nada porque el estado es consistente
      store.refreshBannerVariant();

      // Assert
      expect(useSyncStatusStore.getState().bannerVariant).toBe("offline");
    });
  });

  describe("reset", () => {
    it("restaura todos los valores al estado inicial", () => {
      // Arrange
      const store = useSyncStatusStore.getState();
      store.setMode("local-only");
      store.setConnectivity("offline");
      store.setHasPending(true);
      store.setLastSyncError("error previo");
      store.setLastSyncAttempt("2026-05-01T00:00:00Z");

      // Act
      store.reset();

      // Assert
      const state = useSyncStatusStore.getState();
      expect(state.mode).toBe("cloud");
      expect(state.connectivity).toBe("unknown");
      expect(state.hasPending).toBe(false);
      expect(state.lastSyncAttempt).toBeNull();
      expect(state.lastSyncError).toBeNull();
      expect(state.bannerVariant).toBe("none");
    });
  });
});
