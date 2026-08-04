import { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../features/auth/components/LogoutButton";
import { getTallasDependencies } from "../data/local/tallasDependencies";
import { TallasDependenciesProvider } from "../features/tallas/hooks/TallasDependenciesProvider";
import TallasListScreen from "../features/tallas/screens/TallasListScreen";
import TallaFormScreen from "../features/tallas/screens/TallaFormScreen";
import type { TallasStackParamList } from "./types";

const Stack = createNativeStackNavigator<TallasStackParamList>();

export default function TallasStackNavigator() {
  const deps = useMemo(() => getTallasDependencies(), []);
  return (
    <TallasDependenciesProvider dependencies={deps}>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="TallasList"
          component={TallasListScreen}
          options={{ title: "Tallas", headerRight: () => <LogoutButton /> }}
        />
        <Stack.Screen
          name="TallaForm"
          component={TallaFormScreen}
          options={{ title: "Talla" }}
        />
      </Stack.Navigator>
    </TallasDependenciesProvider>
  );
}
