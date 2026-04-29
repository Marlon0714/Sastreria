import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementCreateScreen from "../features/clients/screens/MeasurementCreateScreen";
import MeasurementHistoryScreen from "../features/clients/screens/MeasurementHistoryScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        name="MeasurementCreate"
        component={MeasurementCreateScreen}
        options={{ title: "Nueva medida" }}
      />
      <Stack.Screen
        name="MeasurementHistory"
        component={MeasurementHistoryScreen}
        options={{ title: "Historial de medidas" }}
      />
    </Stack.Navigator>
  );
}
