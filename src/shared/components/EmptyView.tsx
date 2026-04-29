import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyViewProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyView({ message, actionLabel, onAction }: EmptyViewProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          style={styles.primaryButton}
          onPress={onAction}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#f8fafc",
  },
  message: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
