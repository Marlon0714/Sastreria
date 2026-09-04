import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CamisaMeasurementDetailScreen from "../features/clients/screens/CamisaMeasurementDetailScreen";
import ClientCreateScreen from "../features/clients/screens/ClientCreateScreen";
import ClientDetailScreen from "../features/clients/screens/ClientDetailScreen";
import ClientEditScreen from "../features/clients/screens/ClientEditScreen";
import ClientListScreen from "../features/clients/screens/ClientListScreen";
import MeasurementTypeSelectScreen from "../features/clients/screens/MeasurementTypeSelectScreen";
import PantalonMeasurementDetailScreen from "../features/clients/screens/PantalonMeasurementDetailScreen";
import SacoMeasurementDetailScreen from "../features/clients/screens/SacoMeasurementDetailScreen";
import ChalecoMeasurementDetailScreen from "../features/clients/screens/ChalecoMeasurementDetailScreen";
import { withTabSwipeLock } from "./withTabSwipeLock";
import type { ClientsStackParamList } from "./types";

const Stack = createNativeStackNavigator<ClientsStackParamList>();
const SwipeableClientListScreen = withTabSwipeLock(ClientListScreen);

export default function ClientsStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ClientList" screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ClientList"
        component={SwipeableClientListScreen}
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
        name="SacoMeasurementDetail"
        component={SacoMeasurementDetailScreen}
        options={{ title: "Medidas de saco" }}
      />
      <Stack.Screen
        name="ChalecoMeasurementDetail"
        component={ChalecoMeasurementDetailScreen}
        options={{ title: "Medidas de chaleco" }}
      />
    </Stack.Navigator>
  );
}
