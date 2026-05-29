import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import type { PricingService } from "../domain/pricingService";
import { formatPrice } from "../domain/strings";

interface Props {
  service: PricingService;
  onPress?: () => void;
}

export default function PricingItem({ service, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, ${formatPrice(service.price)}`}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{service.name}</Text>
          {service.notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {service.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{formatPrice(service.price)}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  notes: {
    fontSize: 13,
    color: "#64748b",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
  chevron: {
    fontSize: 20,
    color: "#94a3b8",
    lineHeight: 22,
  },
});
