import React, { useState } from "react";
import { View, Text, ScrollView, Button, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLogStore } from "../state/logStore";

async function copyLogsToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
}

export const LogViewer = () => {
  const { logs, clearLogs, logViewerEnabled, toggleLogViewer } = useLogStore();
  const [copied, setCopied] = useState(false);

  if (!logViewerEnabled) return null;

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`)
      .join("\n");
    void copyLogsToClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Ocultar" onPress={toggleLogViewer} />
        <Button title={copied ? "¡Copiado!" : "Copiar"} onPress={handleCopy} />
        <Button title="Limpiar" onPress={clearLogs} />
      </View>
      <ScrollView style={styles.scroll}>
        {logs.map((log) => (
          <Text
            key={log.id}
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
