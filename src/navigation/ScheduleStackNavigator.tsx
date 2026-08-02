import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ScheduleFormScreen from "../features/schedule/screens/ScheduleFormScreen";
import ScheduleListScreen from "../features/schedule/screens/ScheduleListScreen";
import type { ScheduleStackParamList } from "./types";

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ScheduleList"
        component={ScheduleListScreen}
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
