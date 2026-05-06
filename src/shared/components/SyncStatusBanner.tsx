import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SyncBannerVariant } from "../../data/sync/types";
import { useSyncStatusStore } from "../state/syncStatusStore";

type BannerTone = "amber" | "slate" | "blue";

function getBannerContent(variant: SyncBannerVariant): {
  message: string;
  tone: BannerTone;
} | null {
  if (variant === "local_only") {
    return {
      message: "Modo local activo. Tus cambios se guardan en este dispositivo.",
      tone: "slate",
    };
  }

  if (variant === "offline") {
    return {
      message: "Sin conexion. Tus cambios se sincronizaran al reconectar.",
      tone: "amber",
    };
  }

  if (variant === "syncing_pending") {
    return {
      message: "Hay cambios pendientes por sincronizar.",
      tone: "blue",
    };
  }

  return null;
}

function SyncStatusBannerComponent() {
  const bannerVariant = useSyncStatusStore((state) => state.bannerVariant);
  const content = getBannerContent(bannerVariant);

  if (!content) {
    return null;
  }

  const toneStyle =
    content.tone === "amber"
      ? styles.amber
      : content.tone === "blue"
        ? styles.blue
        : styles.slate;

  return (
    <View
      pointerEvents="none"
      style={styles.container}
      testID="sync-status-banner"
    >
      <View style={[styles.banner, toneStyle]}>
        <Text style={styles.message}>{content.message}</Text>
      </View>
    </View>
  );
}

export const SyncStatusBanner = memo(SyncStatusBannerComponent);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  banner: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  message: {
    fontSize: 12,
    fontWeight: "500",
  },
  slate: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  amber: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  blue: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
});
