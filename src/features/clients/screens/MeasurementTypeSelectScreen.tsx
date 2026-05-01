import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "MeasurementTypeSelect"
>;

export default function MeasurementTypeSelectScreen({
  navigation,
  route,
}: Props) {
  const isCreateMode = route.params.mode === "create";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tipo de medida</Text>
      <Text style={styles.description}>
        El flujo de captura y detalle por prenda se habilitará en la siguiente
        iteración.
      </Text>

      {isCreateMode ? (
        <Pressable
          accessibilityLabel="Continuar sin medidas"
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate("ClientDetail", {
              clientId: route.params.clientId,
            })
          }
        >
          <Text style={styles.primaryButtonText}>Continuar sin medidas</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Volver al detalle del cliente"
          style={styles.secondaryButton}
          onPress={() =>
            navigation.navigate("ClientDetail", {
              clientId: route.params.clientId,
            })
          }
        >
          <Text style={styles.secondaryButtonText}>Volver al detalle</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
});
