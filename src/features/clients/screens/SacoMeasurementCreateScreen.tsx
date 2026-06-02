import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { LoadingView } from "../../../shared/components";
import SacoMeasurementGrid from "../components/SacoMeasurementGrid";
import {
  SACO_FORM_DEFAULTS,
  type SacoFormValues,
} from "../components/SacoMeasurementForm";
import { useUpsertSaco } from "../hooks/useUpsertSaco";

// TODO: agregar validación y feedback de error

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "SacoMeasurementCreate"
>;

export default function SacoMeasurementCreateScreen({
  navigation,
  route,
}: Props) {
  const { clientId } = route.params;
  const { upsertSaco, isSubmitting, error } = useUpsertSaco();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SacoFormValues>({
    defaultValues: SACO_FORM_DEFAULTS,
  });

  const onSubmit = useCallback(
    async (values: SacoFormValues) => {
      const result = await upsertSaco({ ...values, clientId });
      if (result) {
        navigation.replace("ClientDetail", { clientId });
      }
    },
    [clientId, navigation, upsertSaco],
  );

  if (isSubmitting) {
    return <LoadingView message="Guardando medidas..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <SacoMeasurementGrid control={control} errors={errors} />
      <Pressable style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.submitButtonText}>Guardar medidas</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  errorBanner: { backgroundColor: "#fee2e2", padding: 8, borderRadius: 6 },
  errorBannerText: { color: "#b91c1c" },
  submitButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonText: { color: "#fff", fontWeight: "700" },
});
