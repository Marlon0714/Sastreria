import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DashboardScreen from "../features/dashboard/screens/DashboardScreen";
import { withTabSwipeLock } from "./withTabSwipeLock";
import type { DashboardStackParamList } from "./types";

const Stack = createNativeStackNavigator<DashboardStackParamList>();
const SwipeableDashboardScreen = withTabSwipeLock(DashboardScreen);

export default function DashboardStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="DashboardHome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={SwipeableDashboardScreen}
        options={{ title: "Inicio" }}
      />
    </Stack.Navigator>
  );
}
