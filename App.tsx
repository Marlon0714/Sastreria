import "react-native-url-polyfill/auto";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  getClientsDependencies,
  getClientsSyncOrchestrator,
} from "./src/data/local/clientsDependencies";
import { getDatabase } from "./src/data/local/database";
import { runMigrations } from "./src/data/local/migrations";
import { isSupabaseConfigured } from "./src/data/supabase/config";
import { SyncConnectivityController } from "./src/data/sync/SyncConnectivityController";
import { SupabasePullSync } from "./src/data/sync/SupabasePullSync";
import { SupabaseRealtimeInvalidationSubscriber } from "./src/data/sync/SupabaseRealtimeInvalidationSubscriber";
import { SyncLifecycleController } from "./src/data/sync/SyncLifecycleController";
import type { SyncTriggerSource } from "./src/data/sync/types";
import { ClientsDependenciesProvider } from "./src/features/clients/hooks/ClientsDependenciesProvider";
import RootNavigator from "./src/navigation/RootNavigator";
import { useSyncStatusStore } from "./src/shared/state/syncStatusStore";
import { interceptLogs } from "./src/shared/utils/logInterceptor";
import { LogViewer } from "./src/shared/components/LogViewer";
import { LogViewerToggle } from "./src/shared/components/LogViewerToggle";
import MinimalApp from "./src/MinimalApp";

const DIAGNOSTIC_SAFE_BOOT = true;

export default MinimalApp;
