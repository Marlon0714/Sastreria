import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ScheduleDayViewScreen from "../features/schedule/screens/ScheduleDayViewScreen";
import ScheduleFormScreen from "../features/schedule/screens/ScheduleFormScreen";
import type { ScheduleStackParamList } from "./types";

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ScheduleDayView"
        component={ScheduleDayViewScreen}
        options={{ title: "Agenda" }}
      />
      <Stack.Screen
        name="ScheduleForm"
        component={ScheduleFormScreen}
        options={({ route }) => ({
          title: route.params?.scheduleId ? "Editar turno" : "Nuevo turno",
        })}
      />
    </Stack.Navigator>
  );
}
