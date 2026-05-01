import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CamisaMeasurementCreateScreen from "../features/clients/screens/CamisaMeasurementCreateScreen";
import CamisaMeasurementDetailScreen from "../features/clients/screens/CamisaMeasurementDetailScreen";
import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
import PantalonMeasurementCreateScreen from "../features/clients/screens/PantalonMeasurementCreateScreen";
import PantalonMeasurementDetailScreen from "../features/clients/screens/PantalonMeasurementDetailScreen";
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
      <Stack.Screen
        name="CamisaMeasurementCreate"
        component={CamisaMeasurementCreateScreen}
        options={{ title: "Medidas de camisa" }}
      />
      <Stack.Screen
        name="CamisaMeasurementDetail"
        component={CamisaMeasurementDetailScreen}
        options={{ title: "Detalle de medidas — Camisa" }}
      />
      <Stack.Screen
        name="PantalonMeasurementCreate"
        component={PantalonMeasurementCreateScreen}
        options={{ title: "Medidas de pantalón" }}
      />
      <Stack.Screen
        name="PantalonMeasurementDetail"
        component={PantalonMeasurementDetailScreen}
        options={{ title: "Detalle de medidas — Pantalón" }}
      />
    </Stack.Navigator>
  );
}
