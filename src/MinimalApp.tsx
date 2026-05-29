import React from "react";
import { Text, View, StyleSheet } from "react-native";

export default function MinimalApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Minimal App - Diagnostic Build</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  text: {
    fontSize: 18,
    color: "#333",
  },
});
