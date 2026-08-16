import { colors } from "../../../shared/theme/colors";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";

type NavigationWithMyAccount = NativeStackNavigationProp<{
  MyAccount: undefined;
}>;

/**
 * Solo aparece para un operario en su cuenta personal (no en la tablet
 * compartida, que no tiene una sola identidad a la que atribuirle "mi
 * cuenta"/"mis arreglos"). El dueño no lo necesita: administra todo
 * directo en Supabase.
 */
export function ProfileButton() {
  const navigation = useNavigation<NavigationWithMyAccount>();
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isSharedDevice = useIdentityStore(
    (state) => state.ownProfile?.isSharedDevice ?? false,
  );

  if (role !== "operario" || isSharedDevice) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Mi cuenta"
      style={styles.button}
      onPress={() => navigation.navigate("MyAccount")}
    >
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
