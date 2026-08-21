import { colors } from "../../../shared/theme/colors";
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: colors.background,
  },
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bannerText: {
    fontSize: 13,
    color: colors.danger,
  },
  categoryHint: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryHintText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
});
