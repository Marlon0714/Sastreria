import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import ChalecoMeasurementGrid from "../components/ChalecoMeasurementGrid";
import {
  CHALECO_FORM_DEFAULTS,
  type ChalecoFormValues,
} from "../components/ChalecoMeasurementForm";
import { useChalecoMeasurement } from "../hooks/useChalecoMeasurement";
import { useUpsertChaleco } from "../hooks/useUpsertChaleco";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "ChalecoMeasurementCreate"
>;

function toFormValues(
  measurement: Record<string, unknown> | null,
): ChalecoFormValues {
  if (!measurement) return CHALECO_FORM_DEFAULTS;
  return {
    espalda: measurement.espalda != null ? String(measurement.espalda) : "",
    talleTrasero:
      measurement.talleTrasero != null ? String(measurement.talleTrasero) : "",
    largo: measurement.largo != null ? String(measurement.largo) : "",
    pecho: measurement.pecho != null ? String(measurement.pecho) : "",
    cintura: measurement.cintura != null ? String(measurement.cintura) : "",
    base: measurement.base != null ? String(measurement.base) : "",
    escote: measurement.escote != null ? String(measurement.escote) : "",
    notes: typeof measurement.notes === "string" ? measurement.notes : "",
  };
}

export default function ChalecoMeasurementDetailScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isFirstEntry = mode === "create";

  const { measurement, isLoading, error, reload } =
    useChalecoMeasurement(clientId);
  const { upsertChaleco, isSubmitting, error: saveError } = useUpsertChaleco();

  const [isEditing, setIsEditing] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChalecoFormValues>({ defaultValues: CHALECO_FORM_DEFAULTS });

  useEffect(() => {
    if (!isLoading) {
      if (measurement) {
        reset(toFormValues(measurement as unknown as Record<string, unknown>));
        setIsEditing(false);
      } else {
        reset(CHALECO_FORM_DEFAULTS);
        setIsEditing(true);
      }
    }
  }, [isLoading, measurement, reset]);

  const onSubmit = useCallback(
    async (values: ChalecoFormValues) => {
      const result = await upsertChaleco({ ...values, clientId });
      if (result) {
        await reload();
        setSavedOnce(true);
        setIsEditing(false);
        reset(toFormValues(result as unknown as Record<string, unknown>));
      }
    },
    [clientId, reload, reset, upsertChaleco],
  );

  const startEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(true);
  }, [measurement, reset]);

  const cancelEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(false);
  }, [measurement, reset]);

  if (isLoading) return <LoadingView message="Cargando medidas..." />;
  if (error) return <ErrorView message={error} onRetry={() => void reload()} />;

  const showSkip = isFirstEntry && !measurement && !savedOnce;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {saveError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}

      <ChalecoMeasurementGrid
        control={control}
        errors={errors}
        disabled={!isEditing}
      />

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <Pressable
              accessibilityLabel="Guardar medidas de chaleco"
              style={[styles.primaryButton, styles.flex]}
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Text>
            </Pressable>
            {measurement ? (
              <Pressable
                accessibilityLabel="Cancelar edición de chaleco"
                style={[styles.secondaryButton, styles.flex]}
                onPress={cancelEdit}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            accessibilityLabel="Editar medidas de chaleco"
            style={styles.primaryButton}
            onPress={startEdit}
          >
            <Text style={styles.primaryButtonText}>Editar</Text>
          </Pressable>
        )}
      </View>

      {showSkip ? (
        <Pressable
          accessibilityLabel="Continuar sin medidas"
          style={styles.skipButton}
          onPress={() => navigation.popTo("ClientDetail", { clientId })}
        >
          <Text style={styles.skipButtonText}>Continuar sin medidas</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  errorBanner: { backgroundColor: "#fee2e2", borderRadius: 8, padding: 12 },
  errorBannerText: { color: "#991b1b", fontSize: 14 },
  actions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flex: 1,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#334155", fontWeight: "600", fontSize: 16 },
  skipButton: { paddingVertical: 12, alignItems: "center" },
  skipButtonText: {
    color: "#64748b",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
