import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  View,
  TextInput,
  Alert,
} from "react-native";
import { useLogStore } from "../state/logStore";

const LOG_PIN = "0310"; // Cambia este PIN según tu preferencia

export const LogViewerToggle = () => {
  const { logViewerEnabled, toggleLogViewer } = useLogStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState("");

  const handlePress = () => {
    if (logViewerEnabled) {
      toggleLogViewer();
    } else {
      setModalVisible(true);
    }
  };

  const handleSubmit = () => {
    if (pin === LOG_PIN) {
      toggleLogViewer();
      setModalVisible(false);
      setPin("");
    } else {
      Alert.alert("PIN incorrecto", "Intenta de nuevo");
      setPin("");
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.toggle} onPress={handlePress}>
        <Text style={styles.toggleText}>
          {logViewerEnabled ? "Ocultar logs" : "Ver logs"}
        </Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={{ color: "white", marginBottom: 8 }}>
              Ingresa el PIN para ver los logs
            </Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="PIN"
              placeholderTextColor="#aaa"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Aceptar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "white" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toggle: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10000,
    opacity: 0.8,
  },
  toggleText: {
    color: "white",
    fontWeight: "bold",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#333",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    width: 260,
  },
  input: {
    backgroundColor: "#222",
    color: "white",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#555",
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 8,
  },
  submitBtn: {
    backgroundColor: "#1976d2",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
