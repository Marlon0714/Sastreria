import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
import type { ClientsStackParamList } from "./types";

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
    </Stack.Navigator>
  );
}
