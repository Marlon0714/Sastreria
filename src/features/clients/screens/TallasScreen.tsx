import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { LoadingView } from "../../../shared/components";
import TallaForm, {
  TALLA_FORM_DEFAULTS,
  type TallaFormValues,
} from "../components/TallaForm";
import type { ClientTalla, TallaType } from "../domain/types";
import { useTallas } from "../hooks/useTallas";

type Props = NativeStackScreenProps<ClientsStackParamList, "Tallas">;

const TALLA_CONFIG: Record<TallaType, { emoji: string; label: string }> = {
  camisa: { emoji: "👔", label: "Camisa" },
  pantalon: { emoji: "👖", label: "Pantalón" },
  saco: { emoji: "🧥", label: "Saco" },
  chaleco: { emoji: "🦺", label: "Chaleco" },
};

const TALLA_ORDER: TallaType[] = ["camisa", "pantalon", "saco", "chaleco"];

export default function TallasScreen({ route }: Props) {
  const { clientId } = route.params;
  const { tallas, isLoading, error, upsertTalla, deleteTalla, reload } =
    useTallas(clientId);

  const [editingType, setEditingType] = useState<TallaType | null>(null);
  const [editingTalla, setEditingTalla] = useState<ClientTalla | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TallaFormValues>({
    defaultValues: TALLA_FORM_DEFAULTS,
  });

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const openCreate = useCallback(
    (type: TallaType) => {
      setEditingTalla(null);
      setEditingType(type);
      reset({ ...TALLA_FORM_DEFAULTS, type });
    },
    [reset],
  );

  const openEdit = useCallback(
    (talla: ClientTalla) => {
      setEditingTalla(talla);
      setEditingType(talla.type);
      reset({
        type: talla.type,
        value: talla.value,
        notes: talla.notes ?? "",
      });
    },
    [reset],
  );

  const closeModal = useCallback(() => {
    setEditingType(null);
    setEditingTalla(null);
    reset(TALLA_FORM_DEFAULTS);
  }, [reset]);

  const onSubmit = useCallback(
    async (values: TallaFormValues) => {
      let result: ClientTalla | null;
      if (editingTalla) {
        result = await upsertTalla({
          id: editingTalla.id,
          clientId,
          type: values.type,
          value: values.value,
          notes: values.notes,
        });
      } else {
        result = await upsertTalla({
          clientId,
          type: values.type,
          value: values.value,
          notes: values.notes,
        });
      }
      if (result) {
        closeModal();
      }
    },
    [clientId, editingTalla, upsertTalla, closeModal],
  );

  const confirmDelete = useCallback(
    (talla: ClientTalla) => {
      const label = TALLA_CONFIG[talla.type].label.toLowerCase();
      Alert.alert(
        "Eliminar talla",
        `¿Seguro que deseas eliminar la talla de ${label}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => void deleteTalla(talla.id),
          },
        ],
      );
    },
    [deleteTalla],
  );

  if (isLoading && tallas.length === 0) {
    return <LoadingView message="Cargando tallas..." />;
  }

  const tallaByType = new Map<TallaType, ClientTalla>(
    tallas.map((t) => [t.type, t]),
  );

  const modalTitle = editingTalla
    ? `Editar talla de ${editingType ? TALLA_CONFIG[editingType].label.toLowerCase() : ""}`
    : "Nueva talla";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {error && !editingType ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {TALLA_ORDER.map((type) => {
        const talla = tallaByType.get(type);
        const config = TALLA_CONFIG[type];
        return (
          <View key={type} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {config.emoji} {config.label}
              </Text>
            </View>
            <View style={styles.cardContent}>
              {talla ? (
                <>
                  <Text style={styles.tallaValue}>{talla.value}</Text>
                  {talla.notes ? (
                    <Text style={styles.tallaNotes}>{talla.notes}</Text>
                  ) : null}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openEdit(talla)}
                      accessibilityLabel={`Editar talla de ${config.label.toLowerCase()}`}
                    >
                      <Text style={styles.editButtonText}>Editar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(talla)}
                      accessibilityLabel={`Eliminar talla de ${config.label.toLowerCase()}`}
                    >
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.emptyValue}>—</Text>
                  <Pressable
                    style={styles.addButton}
                    onPress={() => openCreate(type)}
                    accessibilityLabel={`Añadir talla de ${config.label.toLowerCase()}`}
                  >
                    <Text style={styles.addButtonText}>Añadir</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
      })}

      <Modal
        visible={editingType !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TallaForm
              control={control}
              errors={errors}
              lockType={editingTalla !== null}
            />
            {error ? <Text style={styles.modalError}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={closeModal}
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveButton}
                onPress={handleSubmit(onSubmit)}
                accessibilityLabel="Guardar talla"
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    color: "#b91c1c",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  tallaValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f766e",
  },
  tallaNotes: {
    fontSize: 13,
    color: "#64748b",
  },
  emptyValue: {
    fontSize: 22,
    color: "#94a3b8",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  editButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    color: "#0f766e",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteButton: {
    borderColor: "#b91c1c",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: 14,
  },
  addButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  addButtonText: {
    color: "#0f766e",
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalError: {
    color: "#b91c1c",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748b",
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
