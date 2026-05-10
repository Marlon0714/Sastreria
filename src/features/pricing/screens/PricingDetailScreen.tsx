import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from "react-native";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PricingStackParamList } from "../../../navigation/types";
import { usePricingDetail } from "../hooks/usePricingDetail";
import { pricingStrings } from "../domain/strings";

type PricingDetailScreenRouteProp = RouteProp<
  PricingStackParamList,
  "PricingDetail"
>;
type PricingDetailScreenNavProp = NativeStackNavigationProp<
  PricingStackParamList,
  "PricingDetail"
>;

export default function PricingDetailScreen() {
  const route = useRoute<PricingDetailScreenRouteProp>();
  const navigation = useNavigation<PricingDetailScreenNavProp>();
  const { id } = route.params;
  const { service, loading, error, syncStatus } = usePricingDetail(id);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>{pricingStrings.title}...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || pricingStrings.notFound}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {syncStatus === "pending" && (
        <Text style={{ color: "#b00020", marginBottom: 8 }}>
          {pricingStrings.syncPending}
        </Text>
      )}
      <Text style={styles.label}>{pricingStrings.title}:</Text>
      <Text style={styles.value}>{service.name}</Text>
      <Text style={styles.label}>Precio:</Text>
      <Text style={styles.value}>${service.price.toLocaleString()}</Text>
      {service.notes ? (
        <>
          <Text style={styles.label}>Notas:</Text>
          <Text style={styles.value}>{service.notes}</Text>
        </>
      ) : null}
      <Button
        title={pricingStrings.editPricing}
        onPress={() => navigation.navigate("PricingForm", { id: service.id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontWeight: "bold",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    marginBottom: 8,
  },
  error: {
    color: "#b00020",
  },
});
