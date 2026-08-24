import { useEffect, useState } from "react";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoutButton } from "../features/auth/components/LogoutButton";
import { ProfileButton } from "../features/auth/components/ProfileButton";
import { colors } from "../shared/theme/colors";
import type { RootTabParamList } from "./types";

interface AppHeaderProps {
  navigationRef: NavigationContainerRefWithCurrent<RootTabParamList>;
}

function navigateToMyAccount(
  navigationRef: NavigationContainerRefWithCurrent<RootTabParamList>,
  activeTab: string | undefined,
): void {
  // Agenda y Precios registran "MyAccount" en su stack — un operario en su
  // propio dispositivo solo ve Agenda, pero se deja la rama de Precios por
  // si en algún momento vuelve a ser visible para operario. Si por alguna
  // razón el ícono se llegara a mostrar en otra pestaña, no hay a dónde
  // navegar y no se hace nada.
  if (activeTab === "ScheduleTab") {
    navigationRef.navigate("ScheduleTab", { screen: "MyAccount" });
  } else if (activeTab === "PricingTab") {
    navigationRef.navigate("PricingTab", { screen: "MyAccount" });
  }
}

/**
 * Header único y persistente para toda la app autenticada, en vez de que
 * cada Stack.Navigator (uno por pestaña) tenga el suyo — antes, cambiar de
 * pestaña se sentía como si la barra de arriba "se cortara" y apareciera
 * otra, porque en los hechos eran headers nativos distintos, uno por
 * pestaña. Este vive fuera del tab navigator y se actualiza leyendo
 * `navigationRef` directamente, así que nunca se desmonta al cambiar de
 * pestaña ni al navegar dentro de una.
 */
export function AppHeader({ navigationRef }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [canGoBack, setCanGoBack] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    const syncFromNavigation = (): void => {
      const options = navigationRef.getCurrentOptions() as
        | { title?: string }
        | undefined;
      setTitle(options?.title);
      setCanGoBack(navigationRef.canGoBack());
      const state = navigationRef.getState();
      setActiveTab(state?.routes[state.index]?.name);
    };

    syncFromNavigation();
    const unsubscribeState = navigationRef.addListener(
      "state",
      syncFromNavigation,
    );
    const unsubscribeOptions = navigationRef.addListener(
      "options",
      syncFromNavigation,
    );
    return () => {
      unsubscribeState();
      unsubscribeOptions();
    };
  }, [navigationRef]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {canGoBack ? (
            <Pressable
              accessibilityLabel="Volver"
              hitSlop={8}
              onPress={() => navigationRef.goBack()}
            >
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.side, styles.sideRight]}>
          {!canGoBack ? (
            <>
              <ProfileButton
                onPress={() => navigateToMyAccount(navigationRef, activeTab)}
              />
              <LogoutButton />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const SIDE_WIDTH = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 8,
  },
  side: {
    minWidth: SIDE_WIDTH,
    flexDirection: "row",
    alignItems: "center",
  },
  sideRight: {
    justifyContent: "flex-end",
    marginLeft: "auto",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
