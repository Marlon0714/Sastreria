import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../features/auth/hooks/useAuth";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { SyncStatusBanner } from "../shared/components";
import FeatureTabsNavigator from "./FeatureTabsNavigator";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, error, signIn } = useAuth();

  // While checking stored session, render nothing (App.tsx shows spinner)
  if (isLoading) return null;

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <View style={styles.authenticatedContainer}>
          <SyncStatusBanner />
          <FeatureTabsNavigator />
        </View>
      ) : (
        <LoginScreen onSignIn={signIn} isLoading={isLoading} error={error} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  authenticatedContainer: {
    flex: 1,
  },
});
