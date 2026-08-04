import { useNavigation } from "@react-navigation/native";
import { Gesture } from "react-native-gesture-handler";

import { resolveSwipeTargetIndex } from "./swipeTabTarget";

/**
 * Gesto de swipe horizontal para navegar entre tabs vecinos, calculado
 * dinámicamente contra el navigator padre (no una lista fija de nombres) —
 * así respeta cuáles tabs están realmente visibles para el rol actual.
 * Pensado para usarse solo en la pantalla raíz de cada stack (ver
 * `withSwipeTabNavigation`): dentro de una pantalla anidada (edición,
 * detalle) un swipe no debe cambiar de tab.
 */
export function useSwipeTabNavigation() {
  const navigation = useNavigation();

  return Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      const parent = navigation.getParent();
      const state = parent?.getState();
      if (!parent || !state) {
        return;
      }

      const targetIndex = resolveSwipeTargetIndex(
        event.translationX,
        state.index,
        state.routes.length,
      );
      if (targetIndex !== null) {
        parent.navigate(state.routes[targetIndex]!.name);
      }
    });
}
