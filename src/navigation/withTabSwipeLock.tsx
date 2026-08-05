import type { ComponentType } from "react";
import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

/**
 * Envuelve la pantalla RAÍZ de un stack anidado en el tab navigator:
 * habilita el swipe entre tabs mientras esta pantalla está enfocada, y lo
 * deshabilita al entrar a una pantalla más profunda del mismo stack
 * (editar, detalle) — así un swipe ahí no cambia de tab por accidente ni
 * compite con el gesto nativo de "volver" del stack. Las pantallas
 * anidadas se registran sin esto.
 */
export function withTabSwipeLock<P extends object>(
  Screen: ComponentType<P>,
): ComponentType<P> {
  function TabSwipeLockedScreen(props: P) {
    const navigation = useNavigation();

    useFocusEffect(
      useCallback(() => {
        const parent = navigation.getParent();
        parent?.setOptions({ swipeEnabled: true });
        return () => {
          parent?.setOptions({ swipeEnabled: false });
        };
      }, [navigation]),
    );

    return <Screen {...props} />;
  }

  TabSwipeLockedScreen.displayName = `withTabSwipeLock(${
    Screen.displayName ?? Screen.name ?? "Component"
  })`;

  return TabSwipeLockedScreen;
}
