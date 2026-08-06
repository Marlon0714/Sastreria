import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { AuthActionsProvider } from "../features/auth/context/AuthActionsContext";
import { useAuth } from "../features/auth/hooks/useAuth";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { SyncStatusBanner } from "../shared/components";
import FeatureTabsNavigator from "./FeatureTabsNavigator";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isSigningIn, error, signIn, signOut } =
    useAuth();

  // While checking stored session, render nothing (App.tsx shows spinner)
  if (isLoading) return null;

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AuthActionsProvider signOut={signOut}>
          <View style={styles.authenticatedContainer}>
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
