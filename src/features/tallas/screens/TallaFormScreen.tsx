import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { type Control, type FieldErrors, useForm } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { TallasStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { MeasurementCard } from "../../clients/components/MeasurementCard";
import { MeasurementGridSection } from "../../clients/components/MeasurementGridSection";
import type { TallaGarmentType, TallaTemplate } from "../domain/types";
import { TALLA_GARMENT_LABELS } from "../domain/types";
import { useTallaTemplateRepository } from "../hooks/TallasDependenciesProvider";
import { useUpsertTallaTemplate } from "../hooks/useUpsertTallaTemplate";

type Props = NativeStackScreenProps<TallasStackParamList, "TallaForm">;

interface TallaFormValues {
  name: string;
  // camisa / saco (16 fields)
  espalda: string;
  hombro: string;
  talleDelantero: string;
  talleTrasero: string;
  distancia: string;
  separacion: string;
  pecho: string;
  cintura: string;
  base: string;
  largo: string;
  largoManga: string;
  anchoManga: string;
  escote: string;
  cuello: string;
  brazo: string;
  puno: string;
  // pantalon (4 extra)
  tiro: string;
  pierna: string;
  rodilla: string;
  bota: string;
  notes: string;
}

const DEFAULTS: TallaFormValues = {
  name: "",
  espalda: "",
  hombro: "",
  talleDelantero: "",
  talleTrasero: "",
  distancia: "",
  separacion: "",
  pecho: "",
  cintura: "",
  base: "",
  largo: "",
  largoManga: "",
  anchoManga: "",
  escote: "",
  cuello: "",
  brazo: "",
  puno: "",
  tiro: "",
  pierna: "",
  rodilla: "",
  bota: "",
  notes: "",
};

function toFormValues(t: TallaTemplate): TallaFormValues {
  const s = (v: number | null | undefined) => (v != null ? String(v) : "");
  return {
    name: t.name,
    espalda: s(t.espalda),
    hombro: s(t.hombro),
    talleDelantero: s(t.talleDelantero),
    talleTrasero: s(t.talleTrasero),
    distancia: s(t.distancia),
    separacion: s(t.separacion),
    pecho: s(t.pecho),
    cintura: s(t.cintura),
    base: s(t.base),
    largo: s(t.largo),
    largoManga: s(t.largoManga),
    anchoManga: s(t.anchoManga),
    escote: s(t.escote),
    cuello: s(t.cuello),
    brazo: s(t.brazo),
    puno: s(t.puno),
    tiro: s(t.tiro),
    pierna: s(t.pierna),
    rodilla: s(t.rodilla),
    bota: s(t.bota),
    notes: t.notes ?? "",
  };
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export default function TallaFormScreen({ navigation, route }: Props) {
  const { type, tallaId } = route.params;
  const repo = useTallaTemplateRepository();
  const { createTemplate, updateTemplate, deleteTemplate, isSubmitting } =
    useUpsertTallaTemplate();

  const [isLoading, setIsLoading] = useState(!!tallaId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TallaFormValues>({ defaultValues: DEFAULTS });

  const nameValue = watch("name");

  const loadTemplate = useCallback(async () => {
    if (!tallaId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const all = await repo.findAll();
      const found = all.find((t) => t.id === tallaId);
      if (found) {
        const vals = toFormValues(found);
        (Object.keys(vals) as (keyof TallaFormValues)[]).forEach((k) =>
          setValue(k, vals[k]),
        );
      }
    } catch {
      setLoadError("No se pudo cargar la talla.");
    } finally {
      setIsLoading(false);
    }
  }, [tallaId, repo, setValue]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    navigation.setOptions({
      title: tallaId
        ? `Editar talla — ${TALLA_GARMENT_LABELS[type]}`
        : `Nueva talla — ${TALLA_GARMENT_LABELS[type]}`,
    });
  }, [navigation, type, tallaId]);

  const onSubmit = async (values: TallaFormValues) => {
    const name = values.name.trim();
    if (!name) {
      Alert.alert("Campo requerido", "El nombre de la talla es obligatorio.");
      return;
    }
    const nums = {
      espalda: parseNum(values.espalda),
      hombro: parseNum(values.hombro),
      talleDelantero: parseNum(values.talleDelantero),
      talleTrasero: parseNum(values.talleTrasero),
      distancia: parseNum(values.distancia),
      separacion: parseNum(values.separacion),
      pecho: parseNum(values.pecho),
      cintura: parseNum(values.cintura),
      base: parseNum(values.base),
      largo: parseNum(values.largo),
      largoManga: parseNum(values.largoManga),
      anchoManga: parseNum(values.anchoManga),
      escote: parseNum(values.escote),
      cuello: parseNum(values.cuello),
      brazo: parseNum(values.brazo),
      puno: parseNum(values.puno),
      tiro: parseNum(values.tiro),
      pierna: parseNum(values.pierna),
      rodilla: parseNum(values.rodilla),
      bota: parseNum(values.bota),
      notes: values.notes.trim() || null,
    };

    let ok: TallaTemplate | null = null;
    if (tallaId) {
      ok = await updateTemplate({ id: tallaId, name, ...nums });
    } else {
      ok = await createTemplate({ name, type, ...nums });
    }
    if (ok) navigation.goBack();
  };

  const onDelete = () => {
    if (!tallaId) return;
    Alert.alert(
      "Eliminar talla",
      "¿Estás seguro que deseas eliminar esta talla? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteTemplate(tallaId);
            if (ok) navigation.goBack();
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingView message="Cargando talla..." />;
  if (loadError)
    return (
      <ErrorView message={loadError} onRetry={() => void loadTemplate()} />
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Nombre */}
      <View style={styles.nameSection}>
        <Text style={styles.fieldLabel}>
          Nombre de la talla <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.nameInput, errors.name && styles.inputError]}
          placeholder='Ej: M, 38, "Talla única"'
          placeholderTextColor="#94a3b8"
          value={nameValue}
          onChangeText={(v) => setValue("name", v)}
          autoCapitalize="characters"
        />
        {errors.name && (
          <Text style={styles.errorText}>El nombre es obligatorio</Text>
        )}
      </View>

      {/* Medidas según tipo */}
      {(type === "camisa" || type === "saco") && (
        <CamisaSacoFields control={control} errors={errors} />
      )}
      {type === "pantalon" && (
        <PantalonFields control={control} errors={errors} />
      )}
      {type === "chaleco" && (
        <ChalecoFields control={control} errors={errors} />
      )}

      {/* Notas */}
      <View style={styles.notesSection}>
        <Text style={styles.fieldLabel}>Notas</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Observaciones opcionales..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={watch("notes")}
          onChangeText={(v) => setValue("notes", v)}
        />
      </View>

      {/* Botones */}
      <Pressable
        style={[styles.saveBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text style={styles.saveBtnText}>
          {isSubmitting ? "Guardando..." : "Guardar talla"}
        </Text>
      </Pressable>

      {tallaId && (
        <Pressable
          style={[styles.deleteBtn, isSubmitting && styles.btnDisabled]}
          onPress={onDelete}
          disabled={isSubmitting}
        >
          <Text style={styles.deleteBtnText}>Eliminar talla</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

/* ── Sub-grids ─────────────────────────────────────────────────────────── */

type GridProps = {
  control: Control<TallaFormValues>;
  errors: FieldErrors<TallaFormValues>;
};

function CamisaSacoFields({ control, errors }: GridProps) {
  return (
    <View style={styles.gridWrapper}>
      <MeasurementGridSection title="Torso">
        <MeasurementCard<TallaFormValues>
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="hombro"
          label="Hombro"
          accessibilityLabel="Hombro (cm)"
          control={control}
          errorMessage={errors.hombro?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="pecho"
          label="Pecho"
          accessibilityLabel="Pecho (cm)"
          control={control}
          errorMessage={errors.pecho?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="cintura"
          label="Cintura"
          accessibilityLabel="Cintura (cm)"
          control={control}
          errorMessage={errors.cintura?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="base"
          label="Base o cadera"
          accessibilityLabel="Base o cadera (cm)"
          control={control}
          errorMessage={errors.base?.message}
        />
      </MeasurementGridSection>
      <MeasurementGridSection title="Largo">
        <MeasurementCard<TallaFormValues>
          name="talleDelantero"
          label="Talle delantero"
          accessibilityLabel="Talle delantero (cm)"
          control={control}
          errorMessage={errors.talleDelantero?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="talleTrasero"
          label="Talle trasero"
          accessibilityLabel="Talle trasero (cm)"
          control={control}
          errorMessage={errors.talleTrasero?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="distancia"
          label="Distancia"
          accessibilityLabel="Distancia (cm)"
          control={control}
          errorMessage={errors.distancia?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="separacion"
          label="Separación"
          accessibilityLabel="Separación (cm)"
          control={control}
          errorMessage={errors.separacion?.message}
        />
      </MeasurementGridSection>
      <MeasurementGridSection title="Manga">
        <MeasurementCard<TallaFormValues>
          name="largoManga"
          label="Largo manga"
          accessibilityLabel="Largo manga (cm)"
          control={control}
          errorMessage={errors.largoManga?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="anchoManga"
          label="Ancho manga"
          accessibilityLabel="Ancho manga (cm)"
          control={control}
          errorMessage={errors.anchoManga?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="brazo"
          label="Brazo"
          accessibilityLabel="Brazo (cm)"
          control={control}
          errorMessage={errors.brazo?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="puno"
          label="Puño"
          accessibilityLabel="Puño (cm)"
          control={control}
          errorMessage={errors.puno?.message}
        />
      </MeasurementGridSection>
      <MeasurementGridSection title="Cuello">
        <MeasurementCard<TallaFormValues>
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="cuello"
          label="Cuello"
          accessibilityLabel="Cuello (cm)"
          control={control}
          errorMessage={errors.cuello?.message}
        />
      </MeasurementGridSection>
    </View>
  );
}

function PantalonFields({ control, errors }: GridProps) {
  return (
    <View style={styles.gridWrapper}>
      <MeasurementGridSection title="Pantalón">
        <MeasurementCard<TallaFormValues>
          name="cintura"
          label="Cintura"
          accessibilityLabel="Cintura (cm)"
          control={control}
          errorMessage={errors.cintura?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="tiro"
          label="Tiro"
          accessibilityLabel="Tiro (cm)"
          control={control}
          errorMessage={errors.tiro?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="base"
          label="Cadera"
          accessibilityLabel="Cadera (cm)"
          control={control}
          errorMessage={errors.base?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="pierna"
          label="Pierna"
          accessibilityLabel="Pierna (cm)"
          control={control}
          errorMessage={errors.pierna?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="rodilla"
          label="Rodilla"
          accessibilityLabel="Rodilla (cm)"
          control={control}
          errorMessage={errors.rodilla?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="bota"
          label="Bota"
          accessibilityLabel="Bota (cm)"
          control={control}
          errorMessage={errors.bota?.message}
        />
      </MeasurementGridSection>
    </View>
  );
}

function ChalecoFields({ control, errors }: GridProps) {
  return (
    <View style={styles.gridWrapper}>
      <MeasurementGridSection title="Chaleco">
        <MeasurementCard<TallaFormValues>
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="talleTrasero"
          label="Talle trasero"
          accessibilityLabel="Talle trasero (cm)"
          control={control}
          errorMessage={errors.talleTrasero?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="pecho"
          label="Pecho"
          accessibilityLabel="Pecho (cm)"
          control={control}
          errorMessage={errors.pecho?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="cintura"
          label="Cintura"
          accessibilityLabel="Cintura (cm)"
          control={control}
          errorMessage={errors.cintura?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="base"
          label="Base o cadera"
          accessibilityLabel="Base o cadera (cm)"
          control={control}
          errorMessage={errors.base?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
        />
      </MeasurementGridSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
  },
  nameSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: "#ef4444",
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
  },
  gridWrapper: {
    gap: 12,
  },
  notesSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    minHeight: 72,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  deleteBtnText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
