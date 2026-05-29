import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "MeasurementTypeSelect"
>;

const GARMENT_OPTIONS = [
  {
    key: "camisa",
    emoji: "👔",
    label: "Camisa",
    createRoute: "CamisaMeasurementDetail",
    viewRoute: "CamisaMeasurementDetail",
  },
  {
    key: "pantalon",
    emoji: "👖",
    label: "Pantalón",
    createRoute: "PantalonMeasurementDetail",
    viewRoute: "PantalonMeasurementDetail",
  },
  {
    key: "saco",
    emoji: "🧥",
    label: "Saco",
    createRoute: "SacoMeasurementCreate",
    viewRoute: "SacoMeasurementEdit",
  },
  {
    key: "chaleco",
    emoji: "🦺",
    label: "Chaleco",
    createRoute: "ChalecoMeasurementCreate",
    viewRoute: "ChalecoMeasurementEdit",
  },
] as const;

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
      <Text style={styles.title}>Tipo de prenda</Text>

      {GARMENT_OPTIONS.map((option) => {
        const routeName = isCreateMode ? option.createRoute : option.viewRoute;
        const accessibilityLabel = isCreateMode
          ? `Registrar medidas de ${option.label}`
          : `Ver medidas de ${option.label}`;

        return (
          <Pressable
            key={option.key}
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : undefined,
            ]}
            onPress={() => {
              if (routeName === "CamisaMeasurementDetail") {
                navigation.navigate("CamisaMeasurementDetail", {
                  clientId,
                  mode,
                });
              } else if (routeName === "PantalonMeasurementDetail") {
                navigation.navigate("PantalonMeasurementDetail", {
                  clientId,
                  mode,
                });
              } else if (routeName === "SacoMeasurementCreate") {
                navigation.navigate("SacoMeasurementCreate", { clientId });
              } else if (routeName === "SacoMeasurementEdit") {
                navigation.navigate("SacoMeasurementEdit", { clientId });
              } else if (routeName === "ChalecoMeasurementCreate") {
                navigation.navigate("ChalecoMeasurementCreate", { clientId });
              } else {
                navigation.navigate("ChalecoMeasurementEdit", { clientId });
              }
            }}
          >
            <Text style={styles.cardEmoji}>{option.emoji}</Text>
            <Text style={styles.cardLabel}>{option.label}</Text>
            <Text style={styles.cardArrow}>›</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardArrow: {
    fontSize: 22,
    color: "#94a3b8",
  },
});
