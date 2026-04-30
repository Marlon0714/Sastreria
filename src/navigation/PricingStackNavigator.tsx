import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PricingPlaceholderScreen from "../features/pricing/screens/PricingPlaceholderScreen";
import type { PricingStackParamList } from "./types";

const Stack = createNativeStackNavigator<PricingStackParamList>();

export default function PricingStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PricingPlaceholder"
        component={PricingPlaceholderScreen}
        options={{ title: "Precios" }}
      />
    </Stack.Navigator>
  );
}
