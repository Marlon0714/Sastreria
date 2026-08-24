import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MyAccountScreen from "../features/account/screens/MyAccountScreen";
import MyActivityScreen from "../features/account/screens/MyActivityScreen";
import { pricingStrings } from "../features/pricing/domain/strings";
import PricingPlaceholderScreen from "../features/pricing/screens/PricingPlaceholderScreen";
import PricingListScreen from "../features/pricing/screens/PricingListScreen";
import PricingDetailScreen from "../features/pricing/screens/PricingDetailScreen";
import PricingFormScreen from "../features/pricing/screens/PricingFormScreen";
import { useIdentityStore } from "../shared/state/identityStore";
import { withTabSwipeLock } from "./withTabSwipeLock";
import type { PricingStackParamList } from "./types";

const Stack = createNativeStackNavigator<PricingStackParamList>();
const SwipeablePricingListScreen = withTabSwipeLock(PricingListScreen);
const SwipeableMyActivityScreen = withTabSwipeLock(MyActivityScreen);

export default function PricingStackNavigator() {
  // Un operario en su propio dispositivo no debe ver el catálogo de precios
  // de todos los servicios — en esa posición de pestaña ve directamente su
  // propia actividad del día ("Mis arreglos") en vez de la lista de precios.
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isOperario = role === "operario";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PricingList"
        component={
          isOperario ? SwipeableMyActivityScreen : SwipeablePricingListScreen
        }
        options={{ title: isOperario ? "Mis arreglos" : "Precios" }}
      />
      <Stack.Screen
        name="PricingDetail"
        component={PricingDetailScreen}
        options={{ title: "Detalle de precio" }}
      />
      <Stack.Screen
        name="PricingForm"
        component={PricingFormScreen}
        options={({ route }) => ({
          title: route.params?.id
            ? pricingStrings.editPricing
            : pricingStrings.addPricing,
        })}
      />
      <Stack.Screen
        name="PricingPlaceholder"
        component={PricingPlaceholderScreen}
        options={{ title: "Placeholder" }}
      />
      <Stack.Screen
        name="MyAccount"
        component={MyAccountScreen}
        options={{ title: "Mi cuenta" }}
      />
      <Stack.Screen
        name="MyActivity"
        component={MyActivityScreen}
        options={{ title: "Mis arreglos" }}
      />
    </Stack.Navigator>
  );
}
