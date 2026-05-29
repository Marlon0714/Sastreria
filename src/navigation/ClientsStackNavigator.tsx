import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CamisaMeasurementDetailScreen from "../features/clients/screens/CamisaMeasurementDetailScreen";
import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientEditScreen from "../features/clients/screens/ClientEditScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
import PantalonMeasurementDetailScreen from "../features/clients/screens/PantalonMeasurementDetailScreen";
import SacoMeasurementCreateScreen from "../features/clients/screens/SacoMeasurementCreateScreen";
import SacoMeasurementEditScreen from "../features/clients/screens/SacoMeasurementEditScreen";
import ChalecoMeasurementCreateScreen from "../features/clients/screens/ChalecoMeasurementCreateScreen";
import ChalecoMeasurementEditScreen from "../features/clients/screens/ChalecoMeasurementEditScreen";
import TallasScreen from "../features/clients/screens/TallasScreen";
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
      <Stack.Screen
        name="SacoMeasurementCreate"
        component={SacoMeasurementCreateScreen}
        options={{ title: "Medidas de saco" }}
      />
      <Stack.Screen
        name="SacoMeasurementEdit"
        component={SacoMeasurementEditScreen}
        options={{ title: "Editar medidas de saco" }}
      />
      <Stack.Screen
        name="ChalecoMeasurementCreate"
        component={ChalecoMeasurementCreateScreen}
        options={{ title: "Medidas de chaleco" }}
      />
      <Stack.Screen
        name="ChalecoMeasurementEdit"
        component={ChalecoMeasurementEditScreen}
        options={{ title: "Editar medidas de chaleco" }}
      />
      <Stack.Screen
        name="Tallas"
        component={TallasScreen}
        options={{ title: "Tallas del cliente" }}
      />
    </Stack.Navigator>
  );
}
