import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import ClientsStackNavigator from "./ClientsStackNavigator";
import PricingStackNavigator from "./PricingStackNavigator";
import ScheduleStackNavigator from "./ScheduleStackNavigator";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function FeatureTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="ClientsTab"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ClientsTab"
        component={ClientsStackNavigator}
        options={{ tabBarLabel: "Clientes", title: "Clientes" }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleStackNavigator}
        options={{ tabBarLabel: "Agenda", title: "Agenda" }}
      />
      <Tab.Screen
        name="PricingTab"
        component={PricingStackNavigator}
        options={{ tabBarLabel: "Precios", title: "Precios" }}
      />
    </Tab.Navigator>
  );
}
