import { Pressable, StyleSheet, Text, View } from "react-native";

interface ErrorViewProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorView({
  message,
  retryLabel = "Reintentar",
  onRetry,
}: ErrorViewProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.secondaryButton} onPress={onRetry}>
          <Text style={styles.secondaryButtonText}>{retryLabel}</Text>
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
  errorText: {
    fontSize: 16,
    color: "#b91c1c",
    textAlign: "center",
  },
  secondaryButton: {
    borderColor: "#0f766e",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
});
