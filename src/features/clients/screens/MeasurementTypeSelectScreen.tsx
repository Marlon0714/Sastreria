import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "MeasurementTypeSelect"
>;

export default function MeasurementTypeSelectScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isCreateMode = mode === "create";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Tipo de medida</Text>
      <Text style={styles.description}>
        {isCreateMode
          ? "Selecciona el tipo de prenda para registrar las medidas."
          : "Selecciona el tipo de prenda para ver las medidas guardadas."}
      </Text>

      <Pressable
        accessibilityLabel={
          isCreateMode ? "Registrar medidas de camisa" : "Ver medidas de camisa"
        }
        style={styles.primaryButton}
        onPress={() =>
          isCreateMode
            ? navigation.navigate("CamisaMeasurementCreate", { clientId })
            : navigation.navigate("CamisaMeasurementDetail", { clientId })
        }
      >
        <Text style={styles.primaryButtonText}>Camisa</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={
          isCreateMode
            ? "Registrar medidas de pantalón"
            : "Ver medidas de pantalón"
        }
        style={styles.primaryButton}
        onPress={() =>
          isCreateMode
            ? navigation.navigate("PantalonMeasurementCreate", { clientId })
            : navigation.navigate("PantalonMeasurementDetail", { clientId })
        }
      >
        <Text style={styles.primaryButtonText}>Pantalón</Text>
      </Pressable>

      {isCreateMode ? (
        <Pressable
          accessibilityLabel="Continuar sin medidas"
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("ClientDetail", { clientId })}
        >
          <Text style={styles.secondaryButtonText}>Continuar sin medidas</Text>
        </Pressable>
      ) : null}
    </ScrollView>
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
