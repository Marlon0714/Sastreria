import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { TallasStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import type { TallaGarmentType, TallaTemplate } from "../domain/types";
import {
  TALLA_GARMENT_EMOJIS,
  TALLA_GARMENT_LABELS,
} from "../domain/types";
import { useTallaTemplateList } from "../hooks/useTallaTemplateList";

type Props = NativeStackScreenProps<TallasStackParamList, "TallasList">;

const GARMENT_TYPES: TallaGarmentType[] = [
  "camisa",
  "pantalon",
  "saco",
  "chaleco",
];

function TallaItem({
  talla,
  onPress,
}: {
  talla: TallaTemplate;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tallaItem} onPress={onPress}>
      <Text style={styles.tallaName}>{talla.name}</Text>
      <Text style={styles.tallaChevron}>›</Text>
    </Pressable>
  );
}

export default function TallasListScreen({ navigation }: Props) {
  const { templates, isLoading, error, reload } = useTallaTemplateList();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) return <LoadingView message="Cargando tallas..." />;
  if (error) return <ErrorView message={error} onRetry={() => void reload()} />;

  const byType = (type: TallaGarmentType) =>
    templates.filter((t) => t.type === type);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageSubtitle}>
        Registra tallas de referencia por tipo de prenda con sus medidas.
      </Text>

      {GARMENT_TYPES.map((type) => {
        const items = byType(type);
        return (
          <View key={type} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>
                  {TALLA_GARMENT_EMOJIS[type]}
                </Text>
                <Text style={styles.sectionTitle}>
                  {TALLA_GARMENT_LABELS[type]}
                </Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => navigation.navigate("TallaForm", { type })}
                accessibilityLabel={`Agregar talla de ${TALLA_GARMENT_LABELS[type]}`}
              >
                <Text style={styles.addBtnText}>+ Agregar</Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <Text style={styles.emptyText}>Sin tallas registradas</Text>
            ) : (
              items.map((talla) => (
                <TallaItem
                  key={talla.id}
                  talla={talla}
                  onPress={() =>
                    navigation.navigate("TallaForm", {
                      type: talla.type,
                      tallaId: talla.id,
                    })
                  }
                />
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    backgroundColor: "#f8fafc",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  addBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  tallaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  tallaName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  tallaChevron: {
    fontSize: 20,
    color: "#94a3b8",
  },
});
