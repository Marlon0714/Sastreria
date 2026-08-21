import { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getTallasDependencies } from "../data/local/tallasDependencies";
import { TALLA_GARMENT_LABELS } from "../features/tallas/domain/types";
import { TallasDependenciesProvider } from "../features/tallas/hooks/TallasDependenciesProvider";
import TallasListScreen from "../features/tallas/screens/TallasListScreen";
import TallaFormScreen from "../features/tallas/screens/TallaFormScreen";
import { withTabSwipeLock } from "./withTabSwipeLock";
import type { TallasStackParamList } from "./types";

const Stack = createNativeStackNavigator<TallasStackParamList>();
const SwipeableTallasListScreen = withTabSwipeLock(TallasListScreen);

export default function TallasStackNavigator() {
  const deps = useMemo(() => getTallasDependencies(), []);
  return (
    <TallasDependenciesProvider dependencies={deps}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="TallasList"
          component={SwipeableTallasListScreen}
          options={{ title: "Tallas" }}
        />
        <Stack.Screen
          name="TallaForm"
          component={TallaFormScreen}
          options={({ route }) => ({
            title: route.params.tallaId
              ? `Editar talla — ${TALLA_GARMENT_LABELS[route.params.type]}`
              : `Nueva talla — ${TALLA_GARMENT_LABELS[route.params.type]}`,
          })}
        />
      </Stack.Navigator>
    </TallasDependenciesProvider>
  );
}
