import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SchedulePlaceholderScreen from "../features/schedule/screens/SchedulePlaceholderScreen";
import type { ScheduleStackParamList } from "./types";

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SchedulePlaceholder"
        component={SchedulePlaceholderScreen}
        options={{ title: "Agenda" }}
      />
    </Stack.Navigator>
  );
}
