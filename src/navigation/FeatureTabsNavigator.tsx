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
    icon: "shirt",
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
 * reservadas al dueño. Desde 2026-08-24, esa pestaña de "Precios" para un
 * operario ya NO muestra el catálogo de precios (`PricingStackNavigator`
 * decide, según el role, si el root de esa pestaña es la lista de precios o
 * "Mis arreglos") — ver `getPricingTabDisplay` más abajo para el label/ícono
 * que corresponde en cada caso.
 */
const TAB_ROLES: Record<TabName, Role[]> = {
  ClientsTab: ["owner"],
  TallasTab: ["owner"],
  ScheduleTab: ["owner", "operario"],
  PricingTab: ["owner", "operario"],
};

/**
 * La pestaña "PricingTab" muestra contenido distinto según el role: el
 * dueño ve el catálogo de precios, el operario ve "Mis arreglos" (su
 * actividad del día) — el catálogo completo de precios no le corresponde a
 * un operario. El componente que se renderiza ahí (`PricingStackNavigator`)
 * decide eso mismo por su cuenta; acá solo se ajusta cómo se ve la pestaña.
 */
function getPricingTabDisplay(
  role: Role | null,
  isSharedDevice: boolean,
): Pick<TabConfig, "label" | "title" | "icon"> {
  // La tablet compartida (mostrador) también tiene role="operario" en su
  // propio perfil, pero la usan varias personas para tareas distintas
  // (incluido cobrar/consultar precios) — igual que `isTabVisibleForRole`,
  // el bypass de dispositivo compartido debe ganarle a la restricción por
  // role. Si no, la tablet pierde el catálogo de precios y muestra "Mis
  // arreglos" filtrado por el id de la tablet, que no es el de ningún
  // operario real (pantalla vacía permanente).
  if (role === "operario" && !isSharedDevice) {
    return { label: "Mis arreglos", title: "Mis arreglos", icon: "cash" };
  }
  return { label: "Precios", title: "Precios", icon: "pricetag" };
}

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
      // Por defecto backBehavior="firstRoute" agrega una entrada de "volver
      // a la primera pestaña" en el historial apenas se cambia a CUALQUIER
      // otra pestaña — eso hacía que canGoBack() diera true en Tallas/
      // Agenda/Precios (mostrando la flecha de volver del header en vez de
      // Mi cuenta/Cerrar sesión), y solo en Clientes (la primera) diera
      // false. "none" evita que cambiar de pestaña cuente como "atrás".
      backBehavior="none"
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
      {visibleTabs.map((tab) => {
        const display =
          tab.name === "PricingTab"
            ? getPricingTabDisplay(role, isSharedDevice)
            : tab;
        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              title: display.title,
              tabBarLabel: display.label,
              tabBarButtonTestID: `tab-${tab.name}`,
              tabBarIcon: ({ color }) => (
                <Ionicons name={display.icon} size={22} color={color} />
              ),
            }}
          />
        );
      })}
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
    fontSize: 12,
    fontWeight: "600",
    textTransform: "none",
    marginTop: 2,
  },
  hiddenIndicator: {
    height: 0,
  },
});
