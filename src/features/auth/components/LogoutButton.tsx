import { colors } from "../../../shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet } from "react-native";

import { useAuthActions } from "../context/AuthActionsContext";

export function LogoutButton() {
  const { signOut } = useAuthActions();

  const handlePress = (): void => {
    Alert.alert("Cerrar sesión", "¿Seguro que deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          void signOut().catch(() => {
            Alert.alert(
              "No se pudo cerrar sesión",
              "Revisa tu conexión e inténtalo de nuevo.",
            );
          });
        },
      },
    ]);
  };

  return (
    <Pressable
      accessibilityLabel="Cerrar sesión"
      style={styles.button}
      onPress={handlePress}
    >
      <Ionicons name="log-out-outline" size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
