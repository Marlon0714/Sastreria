import React from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  Platform,
} from "react-native";
import { useLogStore } from "../state/logStore";

function copyLogsToClipboard(text: string) {
  if (Platform.OS === "web") {
    void navigator.clipboard.writeText(text);
  }
}

export const LogViewer = () => {
  const { logs, clearLogs, logViewerEnabled, toggleLogViewer } = useLogStore();

  if (!logViewerEnabled) return null;

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`)
      .join("\n");
    copyLogsToClipboard(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Ocultar" onPress={toggleLogViewer} />
        <Button title="Copiar" onPress={handleCopy} />
        <Button title="Limpiar" onPress={clearLogs} />
      </View>
      <ScrollView style={styles.scroll}>
        {logs.map((log, i) => (
          <Text
            key={i}
            style={[
              styles.text,
              log.level === "error" && styles.error,
              log.level === "warn" && styles.warn,
            ]}
          >
            [{log.timestamp}] {log.level.toUpperCase()}: {log.message}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#222c",
    maxHeight: "40%",
    zIndex: 9999,
  },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 4 },
  scroll: { maxHeight: 200 },
  text: { color: "white", fontSize: 12 },
  error: { color: "red" },
  warn: { color: "yellow" },
});
