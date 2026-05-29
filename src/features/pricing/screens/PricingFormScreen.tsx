import React, { useEffect } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { PricingStackParamList } from "../../../navigation/types";
import PricingForm from "../components/PricingForm";
import { usePricingForm } from "../hooks/usePricingForm";
import { pricingStrings } from "../domain/strings";
import { PRICING_CATEGORY_LABELS } from "../domain/pricingService";
import { LoadingView } from "../../../shared/components";

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
  const { id, category } = route.params ?? {};
  const { loading, error, initialValues, onSubmit, submitting, isOffline } =
    usePricingForm(id, {
      onSuccess: () => navigation.goBack(),
      onError: (msg) => Alert.alert(pricingStrings.saveError, msg),
    });

  useEffect(() => {
    navigation.setOptions({
      title: id ? pricingStrings.editPricing : pricingStrings.addPricing,
    });
  }, [navigation, id]);

  if (loading) return <LoadingView message="Cargando servicio..." />;

  // Para nuevo servicio, pre-seleccionar la categoría del tab activo
  const mergedInitialValues = id
    ? initialValues
    : { ...initialValues, category: category ?? "arreglo" };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {isOffline && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠ {pricingStrings.offlineBanner}
          </Text>
        </View>
      )}
      {category && !id && (
        <View style={styles.categoryHint}>
          <Text style={styles.categoryHintText}>
            Categoría: {PRICING_CATEGORY_LABELS[category]}
          </Text>
        </View>
      )}
      <View style={styles.formCard}>
        <PricingForm
          initialValues={mergedInitialValues}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: "#f8fafc",
  },
  banner: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  bannerText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  categoryHint: {
    backgroundColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryHintText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e40af",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
