import type { ComponentType } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import type { Role } from "../features/auth/domain/profile";
import { colors } from "../shared/theme/colors";
import { useIdentityStore } from "../shared/state/identityStore";
import ClientsStackNavigator from "./ClientsStackNavigator";
import PricingStackNavigator from "./PricingStackNavigator";
import ScheduleStackNavigator from "./ScheduleStackNavigator";
import TallasStackNavigator from "./TallasStackNavigator";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabName = keyof RootTabParamList;

interface TabConfig {
  name: TabName;
  component: ComponentType;
  label: string;
  title?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ALL_TABS: TabConfig[] = [
  {
    name: "ClientsTab",
    component: ClientsStackNavigator,
    label: "Clientes",
    title: "Clientes",
    icon: "people",
  },
  {
    name: "TallasTab",
    component: TallasStackNavigator,
    label: "Tallas",
    icon: "resize",
  },
  {
    name: "ScheduleTab",
    component: ScheduleStackNavigator,
    label: "Agenda",
    title: "Agenda",
    icon: "calendar",
  },
  {
    name: "PricingTab",
    component: PricingStackNavigator,
    label: "Precios",
    title: "Precios",
    icon: "pricetag",
  },
];

/**
 * Roles que pueden ver cada tab. Punto de partida confirmado (2026-08-03):
 * ambos roles ven todas las tabs por ahora — restringir después es cambiar
 * esta tabla, no rediseñar la navegación.
 */
const TAB_ROLES: Record<TabName, Role[]> = {
  ClientsTab: ["owner", "operario"],
  TallasTab: ["owner", "operario"],
  ScheduleTab: ["owner", "operario"],
  PricingTab: ["owner", "operario"],
};

function isTabVisibleForRole(tab: TabName, role: Role | null): boolean {
  // Sin perfil resuelto (ej. modo local-only sin Supabase configurado) no se
  // oculta nada, para no romper el bypass offline ya existente.
  if (!role) {
    return true;
  }

  return TAB_ROLES[tab].includes(role);
}

export default function FeatureTabsNavigator() {
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const visibleTabs = ALL_TABS.filter((tab) =>
    isTabVisibleForRole(tab.name, role),
  );

  return (
    <Tab.Navigator
      initialRouteName="ClientsTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
