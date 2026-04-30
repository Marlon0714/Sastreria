import { StyleSheet, Text, View } from "react-native";

export default function SchedulePlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Agenda
      </Text>
      <Text style={styles.message}>
        Proximamente podras gestionar arreglos.
      </Text>
      <Text style={styles.caption}>
        Este modulo se habilitara en una siguiente entrega.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  message: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});
