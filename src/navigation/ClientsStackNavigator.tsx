import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CamisaMeasurementDetailScreen from "../features/clients/screens/CamisaMeasurementDetailScreen";
import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientEditScreen from "../features/clients/screens/ClientEditScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
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
        name="ClientEdit"
        component={ClientEditScreen}
        options={{ title: "Editar cliente" }}
      />
      <Stack.Screen
        name="MeasurementTypeSelect"
        component={MeasurementTypeSelectScreen}
        options={{ title: "Tipo de medida" }}
      />
      <Stack.Screen
        name="CamisaMeasurementDetail"
        component={CamisaMeasurementDetailScreen}
        options={{ title: "Medidas de camisa" }}
      />
      <Stack.Screen
        name="PantalonMeasurementDetail"
        component={PantalonMeasurementDetailScreen}
        options={{ title: "Medidas de pantalón" }}
      />
    </Stack.Navigator>
  );
}
