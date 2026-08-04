import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";

import { useSwipeTabNavigation } from "./useSwipeTabNavigation";

/**
 * Envuelve la pantalla RAÍZ de un stack con el gesto de swipe entre tabs.
 * Solo se aplica al registrar la primera Stack.Screen de cada navigator —
 * las pantallas anidadas (editar, detalle, formularios) se registran sin
 * esto, para que un swipe ahí no cambie de tab por accidente.
 */
export function withSwipeTabNavigation<P extends object>(
  Screen: ComponentType<P>,
): ComponentType<P> {
  function SwipeableRootScreen(props: P) {
    const gesture = useSwipeTabNavigation();
    return (
      <GestureDetector gesture={gesture}>
        <View style={styles.flex}>
          <Screen {...props} />
        </View>
      </GestureDetector>
    );
  }

  SwipeableRootScreen.displayName = `withSwipeTabNavigation(${
    Screen.displayName ?? Screen.name ?? "Component"
  })`;

  return SwipeableRootScreen;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
