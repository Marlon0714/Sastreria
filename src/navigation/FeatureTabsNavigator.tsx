import type { ComponentType } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Role } from "../features/auth/domain/profile";
import { colors } from "../shared/theme/colors";
import { useIdentityStore } from "../shared/state/identityStore";
import ClientsStackNavigator from "./ClientsStackNavigator";
import PricingStackNavigator from "./PricingStackNavigator";
import ScheduleStackNavigator from "./ScheduleStackNavigator";
import TallasStackNavigator from "./TallasStackNavigator";
import type { RootTabParamList } from "./types";

const Tab = createMaterialTopTabNavigator<RootTabParamList>();

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
 * Roles que pueden ver cada tab. Confirmado (2026-08-05): un operario en su
 * propio dispositivo solo ve Agenda y Precios; Clientes/Tallas quedan
 * reservadas al dueño.
 */
const TAB_ROLES: Record<TabName, Role[]> = {
  ClientsTab: ["owner"],
  TallasTab: ["owner"],
  ScheduleTab: ["owner", "operario"],
  PricingTab: ["owner", "operario"],
};

function isTabVisibleForRole(
  tab: TabName,
  role: Role | null,
  isSharedDevice: boolean,
): boolean {
  // Sin perfil resuelto (ej. modo local-only sin Supabase configurado) no se
  // oculta nada, para no romper el bypass offline ya existente.
  if (!role) {
    return true;
  }

  // La tablet del mostrador la usan varias personas para tareas distintas
  // (agendar, tomar medidas, cobrar) — restringir por el role de SU cuenta
  // (siempre "operario") la dejaría sin Clientes/Tallas sin sentido alguno.
  if (isSharedDevice) {
    return true;
  }

  return TAB_ROLES[tab].includes(role);
}

const TAB_BAR_HEIGHT = 56;

export default function FeatureTabsNavigator() {
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isSharedDevice = useIdentityStore(
    (state) => state.ownProfile?.isSharedDevice ?? false,
  );
  const visibleTabs = ALL_TABS.filter((tab) =>
    isTabVisibleForRole(tab.name, role, isSharedDevice),
  );
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName={visibleTabs[0]?.name}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarPressColor: "transparent",
        tabBarPressOpacity: 0.7,
        tabBarIndicatorStyle: styles.hiddenIndicator,
        tabBarStyle: [
          styles.tabBar,
          { height: TAB_BAR_HEIGHT + bottomPadding, paddingBottom: bottomPadding },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarLabel: tab.label,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color }) => (
              <Ionicons name={tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    flexDirection: "column",
    justifyContent: "center",
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "none",
    marginTop: 2,
  },
  hiddenIndicator: {
    height: 0,
  },
});
