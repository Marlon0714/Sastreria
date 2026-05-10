import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import type { PricingService } from "../domain/pricingService";

interface Props {
  service: PricingService;
  onPress?: () => void;
}

export default function PricingItem({ service, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.item}>
      <View>
        <Text style={styles.name}>{service.name}</Text>
        <Text style={styles.price}>${service.price.toLocaleString()}</Text>
        {service.notes ? (
          <Text style={styles.notes}>{service.notes}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
  price: {
    color: "#1976d2",
    fontSize: 15,
    marginTop: 2,
  },
  notes: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
});
