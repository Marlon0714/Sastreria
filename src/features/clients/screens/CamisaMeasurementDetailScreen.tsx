import { colors } from "../../../shared/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import CamisaMeasurementGrid from "../components/CamisaMeasurementGrid";
import {
  CAMISA_FORM_DEFAULTS,
  type CamisaFormValues,
} from "../components/CamisaMeasurementForm";
import { useMeasurementRepository } from "../hooks/ClientsDependenciesProvider";
import { useCamisaMeasurement } from "../hooks/useCamisaMeasurement";
import { useUpsertCamisa } from "../hooks/useUpsertCamisa";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "CamisaMeasurementDetail"
>;

function toFormValues(
  measurement: Record<string, unknown> | null,
): CamisaFormValues {
  if (!measurement) return CAMISA_FORM_DEFAULTS;
  return {
    espalda: measurement.espalda != null ? String(measurement.espalda) : "",
    hombro: measurement.hombro != null ? String(measurement.hombro) : "",
    talleDelantero:
      measurement.talleDelantero != null
        ? String(measurement.talleDelantero)
        : "",
    talleTrasero:
      measurement.talleTrasero != null ? String(measurement.talleTrasero) : "",
    distancia:
      measurement.distancia != null ? String(measurement.distancia) : "",
    separacion:
      measurement.separacion != null ? String(measurement.separacion) : "",
    pechoAjustado:
      measurement.pechoAjustado != null
        ? String(measurement.pechoAjustado)
        : "",
    pechoAncho:
      measurement.pechoAncho != null ? String(measurement.pechoAncho) : "",
    cinturaAjustado:
      measurement.cinturaAjustado != null
        ? String(measurement.cinturaAjustado)
        : "",
    cinturaAncho:
      measurement.cinturaAncho != null
        ? String(measurement.cinturaAncho)
        : "",
    baseAjustado:
      measurement.baseAjustado != null
        ? String(measurement.baseAjustado)
        : "",
    baseAncho:
      measurement.baseAncho != null ? String(measurement.baseAncho) : "",
    largo: measurement.largo != null ? String(measurement.largo) : "",
    mangaLarga:
      measurement.mangaLarga != null ? String(measurement.mangaLarga) : "",
    mangaCorta:
      measurement.mangaCorta != null ? String(measurement.mangaCorta) : "",
    escote: measurement.escote != null ? String(measurement.escote) : "",
    cuelloNormal:
      measurement.cuelloNormal != null
        ? String(measurement.cuelloNormal)
        : "",
    cuelloCruce:
      measurement.cuelloCruce != null
        ? String(measurement.cuelloCruce)
        : "",
    brazo: measurement.brazo != null ? String(measurement.brazo) : "",
    puno: measurement.puno != null ? String(measurement.puno) : "",
    notes: typeof measurement.notes === "string" ? measurement.notes : "",
  };
}

// Campos de medida validados por upsertCamisaSchema (vía `validate`, ya usado
// para la conversión/coerción dentro del hook). Sin validarlos antes del
// submit, los mensajes de error por campo quedaban "muertos": el hook
// detectaba el valor fuera de rango en su `.parse()` interno pero solo
// exponía un banner genérico.
const CAMISA_MEASUREMENT_KEYS: (keyof CamisaFormValues)[] = [
  "espalda",
  "hombro",
  "talleDelantero",
  "talleTrasero",
  "distancia",
  "separacion",
  "pechoAjustado",
  "pechoAncho",
  "cinturaAjustado",
  "cinturaAncho",
  "baseAjustado",
  "baseAncho",
  "largo",
  "mangaLarga",
  "mangaCorta",
  "escote",
  "cuelloNormal",
  "cuelloCruce",
  "brazo",
  "puno",
  "notes",
];

export default function CamisaMeasurementDetailScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isFirstEntry = mode === "create";

  const { measurement, isLoading, error, reload } =
    useCamisaMeasurement(clientId);
  const {
    upsertCamisa,
    isSubmitting,
    error: saveError,
    validate,
  } = useUpsertCamisa();
  const measurementRepository = useMeasurementRepository();

  // true mientras el formulario está activo para ingresar/editar datos
  const [isEditing, setIsEditing] = useState(false);
  // true después de que el usuario guardó al menos una vez en esta sesión
  const [savedOnce, setSavedOnce] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CamisaFormValues>({ defaultValues: CAMISA_FORM_DEFAULTS });

  // Una vez que carguen los datos, decidir el estado inicial
  useEffect(() => {
    if (!isLoading) {
      if (measurement) {
        // Ya hay medidas → vista disabled, poblar form
        reset(toFormValues(measurement as unknown as Record<string, unknown>));
        setIsEditing(false);
      } else {
        // Sin medidas → abrir directamente en modo edición
        reset(CAMISA_FORM_DEFAULTS);
        setIsEditing(true);
      }
    }
  }, [isLoading, measurement, reset]);

  const onSubmit = useCallback(
    async (values: CamisaFormValues) => {
      const validationErrors = validate({ ...values, clientId });

      let hasErrors = false;
      for (const key of CAMISA_MEASUREMENT_KEYS) {
        const validationError = validationErrors[key];
        if (validationError?.message) {
          hasErrors = true;
          setError(key, { type: "manual", message: validationError.message });
        }
      }

      if (hasErrors) {
        return;
      }

      const result = await upsertCamisa({ ...values, clientId });
      if (result) {
        await reload();
        setSavedOnce(true);
        setIsEditing(false);
        // Poblar el form con los valores guardados
        reset(toFormValues(result as unknown as Record<string, unknown>));
      }
    },
    [clientId, reload, reset, setError, upsertCamisa, validate],
  );

  const startEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(true);
  }, [measurement, reset]);

  const cancelEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(false);
  }, [measurement, reset]);

  const handleDelete = useCallback(async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await measurementRepository.deleteCamisa(clientId);
      await reload();
    } catch {
      setDeleteError(
        "No se pudo eliminar la medida de camisa. Intenta nuevamente.",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [clientId, measurementRepository, reload]);

  const confirmDelete = useCallback(() => {
    if (isDeleting) return;

    Alert.alert(
      "Eliminar medida",
      "¿Seguro que deseas eliminar esta medida de camisa? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void handleDelete(),
        },
      ],
    );
  }, [handleDelete, isDeleting]);

  if (isLoading) return <LoadingView message="Cargando medidas..." />;

  if (error) return <ErrorView message={error} onRetry={() => void reload()} />;

  // Mostrar "Continuar sin medidas" solo si: es el flujo de creación Y aún no
  // existe medida Y el usuario no ha guardado en esta sesión.
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

      <CamisaMeasurementGrid
        control={control}
        errors={errors}
        disabled={!isEditing}
      />

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <Pressable
              accessibilityLabel="Guardar medidas de camisa"
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
                accessibilityLabel="Cancelar edición de camisa"
                style={[styles.secondaryButton, styles.flex]}
                onPress={cancelEdit}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            accessibilityLabel="Editar medidas de camisa"
            style={styles.primaryButton}
            onPress={startEdit}
          >
            <Text style={styles.primaryButtonText}>Editar</Text>
          </Pressable>
        )}
      </View>

      {measurement && !isEditing ? (
        <>
          <Pressable
            accessibilityLabel="Eliminar medida de camisa"
            disabled={isDeleting}
            style={[
              styles.deleteButton,
              isDeleting ? styles.deleteButtonDisabled : null,
            ]}
            onPress={confirmDelete}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting ? "Eliminando..." : "Eliminar medida"}
            </Text>
          </Pressable>
          {deleteError ? (
            <Text style={styles.deleteErrorText}>{deleteError}</Text>
          ) : null}
        </>
      ) : null}

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
  errorBanner: { backgroundColor: colors.dangerSoft, borderRadius: 8, padding: 12 },
  errorBannerText: { color: "#991b1b", fontSize: 14 },
  actions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  primaryButton: {
    backgroundColor: colors.primary,
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
  deleteButton: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: colors.danger, fontWeight: "700", fontSize: 16 },
  deleteErrorText: { color: colors.danger, fontSize: 13 },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#64748b",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
