import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Profile } from "../domain/profile";

interface OfflineActorPickerModalProps {
  visible: boolean;
  operarios: Profile[];
  isLoading: boolean;
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

export function OfflineActorPickerModal({
  visible,
  operarios,
  isLoading,
  onSelect,
  onCancel,
}: OfflineActorPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>¿Quién eres?</Text>
          <Text style={styles.subtitle}>
            Sin conexión no se puede validar un PIN. Esta acción quedará
            marcada como &quot;sin verificar&quot; en el historial.
          </Text>

          {isLoading ? (
            <ActivityIndicator accessibilityLabel="Cargando operarios" />
          ) : (
            <FlatList
              style={styles.list}
              data={operarios}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No hay operarios disponibles sin conexión.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  accessibilityLabel={`Elegir a ${item.displayName}`}
                  style={styles.option}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.optionText}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity
            onPress={onCancel}
            accessibilityLabel="Cancelar"
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  list: {
    maxHeight: 240,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionText: {
    color: "#0f172a",
    fontSize: 15,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    padding: 16,
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 16,
  },
  cancelText: {
    fontSize: 14,
    color: "#64748b",
  },
});
