import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import ClientsStackNavigator from "./ClientsStackNavigator";
import PricingStackNavigator from "./PricingStackNavigator";
import ScheduleStackNavigator from "./ScheduleStackNavigator";
import TallasStackNavigator from "./TallasStackNavigator";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function FeatureTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="ClientsTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      <Tab.Screen
        name="ClientsTab"
        component={ClientsStackNavigator}
        options={{
          tabBarLabel: "Clientes",
          title: "Clientes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TallasTab"
        component={TallasStackNavigator}
        options={{
          tabBarLabel: "Tallas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="resize" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleStackNavigator}
        options={{
          tabBarLabel: "Agenda",
          title: "Agenda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PricingTab"
        component={PricingStackNavigator}
        options={{
          tabBarLabel: "Precios",
          title: "Precios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
