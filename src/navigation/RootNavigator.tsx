import { NavigationContainer } from "@react-navigation/native";

import { useAuth } from "../features/auth/hooks/useAuth";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import FeatureTabsNavigator from "./FeatureTabsNavigator";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, error, signIn } = useAuth();

  // While checking stored session, render nothing (App.tsx shows spinner)
  if (isLoading) return null;

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <FeatureTabsNavigator />
      ) : (
        <LoginScreen onSignIn={signIn} isLoading={isLoading} error={error} />
      )}
    </NavigationContainer>
  );
}
