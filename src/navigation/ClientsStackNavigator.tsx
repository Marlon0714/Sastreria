import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Text, View } from "react-native";

import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
import type { ClientsStackParamList } from "./types";

// Placeholder screens for routes declared in ClientsStackParamList but not yet
// implemented. Prevents runtime crashes on navigation.navigate() calls while
// TypeScript keeps route param types fully enforced. Remove when real screens
// are added in N-022..N-025.
function PlaceholderScreen() {
  return <View><Text>Próximamente</Text></View>;
}

const Stack = createNativeStackNavigator<ClientsStackParamList>();

export default function ClientsStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ClientList">
      <Stack.Screen
        name="ClientList"
        component={ClientListScreen}
        options={{ title: "Clientes" }}
      />
      <Stack.Screen
        name="ClientCreate"
        component={ClientCreateScreen}
        options={{ title: "Nuevo cliente" }}
      />
      <Stack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{ title: "Detalle del cliente" }}
      />
      <Stack.Screen
        name="MeasurementTypeSelect"
        component={MeasurementTypeSelectScreen}
        options={{ title: "Tipo de medida" }}
      />
      <Stack.Screen
        name="CamisaMeasurementCreate"
        component={PlaceholderScreen}
        options={{ title: "Medidas de camisa" }}
      />
      <Stack.Screen
        name="CamisaMeasurementDetail"
        component={PlaceholderScreen}
        options={{ title: "Detalle de medidas — Camisa" }}
      />
      <Stack.Screen
        name="PantalonMeasurementCreate"
        component={PlaceholderScreen}
        options={{ title: "Medidas de pantalón" }}
      />
      <Stack.Screen
        name="PantalonMeasurementDetail"
        component={PlaceholderScreen}
        options={{ title: "Detalle de medidas — Pantalón" }}
      />
    </Stack.Navigator>
  );
}
