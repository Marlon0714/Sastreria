import { colors } from "../../../shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";

interface ProfileButtonProps {
  onPress: () => void;
}

/**
 * Aparece para operario y dueño en su cuenta personal (no en la tablet
 * compartida, que no tiene una sola identidad a la que atribuirle "mi
 * cuenta"/"mis arreglos"). Desde N-106 (fase a) el dueño también entra a
 * "Mi cuenta", pero en modo solo lectura (ver `MyAccountScreen`); habilitar
 * la edición de correo/contraseña/PIN para el dueño es la fase (b), todavía
 * no implementada.
 *
 * Recibe `onPress` en vez de navegar internamente con `useNavigation()`
 * porque vive en AppHeader, fuera de cualquier Stack.Navigator concreto —
 * quien lo use decide a qué stack anidado navegar según la pestaña activa.
 */
export function ProfileButton({ onPress }: ProfileButtonProps) {
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isSharedDevice = useIdentityStore(
    (state) => state.ownProfile?.isSharedDevice ?? false,
  );

  if (isSharedDevice || (role !== "operario" && role !== "owner")) {
    return null;
  }

  return (
    <Pressable accessibilityLabel="Mi cuenta" style={styles.button} onPress={onPress}>
      <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
