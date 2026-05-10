import React from "react";
import { View, StyleSheet, Text, ActivityIndicator, Alert } from "react-native";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PricingStackParamList } from "../../../navigation/types";
import PricingForm from "../components/PricingForm";
import { usePricingForm } from "../hooks/usePricingForm";
import { pricingStrings } from "../domain/strings";

type PricingFormScreenRouteProp = RouteProp<
  PricingStackParamList,
  "PricingForm"
>;
type PricingFormScreenNavProp = NativeStackNavigationProp<
  PricingStackParamList,
  "PricingForm"
>;

export default function PricingFormScreen() {
  const route = useRoute<PricingFormScreenRouteProp>();
  const navigation = useNavigation<PricingFormScreenNavProp>();
  const { id } = route.params || {};
  const {
    loading,
    error,
    initialValues,
    onSubmit,
    submitting,
    syncStatus,
    isOffline,
  } = usePricingForm(id, {
    onSuccess: () => navigation.goBack(),
    onError: (msg) => Alert.alert(pricingStrings.saveError, msg),
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>{pricingStrings.title}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <Text style={{ color: "#b00020", marginBottom: 8 }}>
          {pricingStrings.offlineBanner}
        </Text>
      )}
      {syncStatus === "pending" && !isOffline && (
        <Text style={{ color: "#b00020", marginBottom: 8 }}>
          {pricingStrings.syncPending}
        </Text>
      )}
      <PricingForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        submitting={submitting}
        error={error}
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
});
