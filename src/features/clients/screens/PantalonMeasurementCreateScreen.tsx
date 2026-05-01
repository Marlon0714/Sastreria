import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { LoadingView } from "../../../shared/components";
import PantalonMeasurementForm, {
  PANTALON_FORM_DEFAULTS,
  type PantalonFormValues,
} from "../components/PantalonMeasurementForm";
import { useUpsertPantalon } from "../hooks/useUpsertPantalon";

type Props = NativeStackScreenProps<ClientsStackParamList, "PantalonMeasurementCreate">;

export default function PantalonMeasurementCreateScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const { upsertPantalon, isSubmitting, error } = useUpsertPantalon();

  const { control, handleSubmit, formState: { errors } } = useForm<PantalonFormValues>({
    defaultValues: PANTALON_FORM_DEFAULTS,
  });

  const onSubmit = useCallback(
    async (values: PantalonFormValues) => {
      const result = await upsertPantalon({ ...values, clientId });
      if (result) {
        navigation.replace("PantalonMeasurementDetail", { clientId });
      }
    },
    [clientId, navigation, upsertPantalon],
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

      <PantalonMeasurementForm control={control} errors={errors} disabled={false} />

      <Pressable
        accessibilityLabel="Guardar medidas de pantalón"
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
