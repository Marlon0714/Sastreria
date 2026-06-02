import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PricingPlaceholderScreen from "../features/pricing/screens/PricingPlaceholderScreen";
import PricingListScreen from "../features/pricing/screens/PricingListScreen";
import PricingDetailScreen from "../features/pricing/screens/PricingDetailScreen";
import PricingFormScreen from "../features/pricing/screens/PricingFormScreen";
import type { PricingStackParamList } from "./types";

const Stack = createNativeStackNavigator<PricingStackParamList>();

export default function PricingStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PricingList"
        component={PricingListScreen}
        options={{ title: "Precios" }}
      />
      <Stack.Screen
        name="PricingDetail"
        component={PricingDetailScreen}
        options={{ title: "Detalle de precio" }}
      />
      <Stack.Screen
        name="PricingForm"
        component={PricingFormScreen}
        options={{ title: "Editar/Crear precio" }}
      />
      <Stack.Screen
        name="PricingPlaceholder"
        component={PricingPlaceholderScreen}
        options={{ title: "Placeholder" }}
      />
    </Stack.Navigator>
  );
}
