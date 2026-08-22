import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MyAccountScreen from "../features/account/screens/MyAccountScreen";
import MyActivityScreen from "../features/account/screens/MyActivityScreen";
import ScheduleDayViewScreen from "../features/schedule/screens/ScheduleDayViewScreen";
import ScheduleFormScreen from "../features/schedule/screens/ScheduleFormScreen";
import { withTabSwipeLock } from "./withTabSwipeLock";
import type { ScheduleStackParamList } from "./types";

const Stack = createNativeStackNavigator<ScheduleStackParamList>();
const SwipeableScheduleDayViewScreen = withTabSwipeLock(
  ScheduleDayViewScreen,
);

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ScheduleDayView"
        component={SwipeableScheduleDayViewScreen}
        options={{ title: "Agenda" }}
      />
      <Stack.Screen
        name="ScheduleForm"
        component={ScheduleFormScreen}
        options={({ route }) => ({
          title: route.params?.scheduleId ? "Editar turno" : "Nuevo turno",
        })}
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
