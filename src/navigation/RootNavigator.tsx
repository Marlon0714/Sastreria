import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { AuthActionsProvider } from "../features/auth/context/AuthActionsContext";
import { useAuth } from "../features/auth/hooks/useAuth";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { SyncStatusBanner } from "../shared/components";
import { AppHeader } from "./AppHeader";
import FeatureTabsNavigator from "./FeatureTabsNavigator";
import type { RootTabParamList } from "./types";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isSigningIn, error, signIn, signOut } =
    useAuth();
  const navigationRef = useNavigationContainerRef<RootTabParamList>();

  // While checking stored session, render nothing (App.tsx shows spinner)
  if (isLoading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? (
        <AuthActionsProvider signOut={signOut}>
          <View style={styles.authenticatedContainer}>
            <AppHeader navigationRef={navigationRef} />
            <SyncStatusBanner />
            <FeatureTabsNavigator />
          </View>
        </AuthActionsProvider>
      ) : (
        <LoginScreen onSignIn={signIn} isLoading={isSigningIn} error={error} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  authenticatedContainer: {
    flex: 1,
  },
});
