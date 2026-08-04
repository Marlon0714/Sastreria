import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LogoutButton } from "../features/auth/components/LogoutButton";
import ScheduleDayViewScreen from "../features/schedule/screens/ScheduleDayViewScreen";
import ScheduleFormScreen from "../features/schedule/screens/ScheduleFormScreen";
import { withSwipeTabNavigation } from "./SwipeableRootScreen";
import type { ScheduleStackParamList } from "./types";

const Stack = createNativeStackNavigator<ScheduleStackParamList>();
const SwipeableScheduleDayViewScreen = withSwipeTabNavigation(
  ScheduleDayViewScreen,
);

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ScheduleDayView"
        component={SwipeableScheduleDayViewScreen}
        options={{ title: "Agenda", headerRight: () => <LogoutButton /> }}
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
