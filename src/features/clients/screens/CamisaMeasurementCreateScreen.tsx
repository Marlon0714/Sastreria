import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import CamisaMeasurementForm, {
  CAMISA_FORM_DEFAULTS,
  type CamisaFormValues,
} from "../components/CamisaMeasurementForm";
import { useUpsertCamisa } from "../hooks/useUpsertCamisa";

type Props = NativeStackScreenProps<ClientsStackParamList, "CamisaMeasurementCreate">;

export default function CamisaMeasurementCreateScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const { upsertCamisa, isSubmitting, error } = useUpsertCamisa();

  const { control, handleSubmit, formState: { errors } } = useForm<CamisaFormValues>({
    defaultValues: CAMISA_FORM_DEFAULTS,
  });

  const onSubmit = useCallback(
    async (values: CamisaFormValues) => {
      const result = await upsertCamisa({ ...values, clientId });
      if (result) {
        navigation.replace("CamisaMeasurementDetail", { clientId });
      }
    },
    [clientId, navigation, upsertCamisa],
  );

  if (isSubmitting) {
    return <LoadingView message="Guardando medidas..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <CamisaMeasurementForm control={control} errors={errors} disabled={false} />

      <Pressable
        accessibilityLabel="Guardar medidas de camisa"
        style={styles.primaryButton}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.primaryButtonText}>Guardar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  errorBanner: { backgroundColor: "#fee2e2", borderRadius: 8, padding: 12 },
  errorBannerText: { color: "#991b1b", fontSize: 14 },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
