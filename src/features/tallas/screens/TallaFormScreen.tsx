import { colors } from "../../../shared/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
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
import { SIZE_VALUE_PATTERN } from "../../../shared/domain/textPatterns";
import { MeasurementCard } from "../../clients/components/MeasurementCard";
import { MeasurementGridSection } from "../../clients/components/MeasurementGridSection";
import { MeasurementGroupCard } from "../../clients/components/MeasurementGroupCard";
import type { TallaGarmentType, TallaTemplate } from "../domain/types";
import { TALLA_GARMENT_LABELS } from "../domain/types";
import { useTallaTemplateRepository } from "../hooks/TallasDependenciesProvider";
import { useUpsertTallaTemplate } from "../hooks/useUpsertTallaTemplate";

type Props = NativeStackScreenProps<TallasStackParamList, "TallaForm">;

interface TallaFormValues {
  name: string;
  // camisa / saco (20 fields)
  espalda: string;
  hombro: string;
  talleDelantero: string;
  talleTrasero: string;
  distancia: string;
  separacion: string;
  pechoAjustado: string;
  pechoAncho: string;
  cintura: string;
  cinturaAjustado: string;
  cinturaAncho: string;
  base: string;
  baseAjustado: string;
  baseAncho: string;
  largo: string;
  mangaLarga: string;
  mangaCorta: string;
  escote: string;
  cuelloNormal: string;
  cuelloCruce: string;
  brazo: string;
  puno: string;
  // pantalon (5 extra)
  entrepierna: string;
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
  pechoAjustado: "",
  pechoAncho: "",
  cintura: "",
  cinturaAjustado: "",
  cinturaAncho: "",
  base: "",
  baseAjustado: "",
  baseAncho: "",
  largo: "",
  mangaLarga: "",
  mangaCorta: "",
  escote: "",
  cuelloNormal: "",
  cuelloCruce: "",
  brazo: "",
  puno: "",
  entrepierna: "",
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
    pechoAjustado: s(t.pechoAjustado),
    pechoAncho: s(t.pechoAncho),
    cintura: s(t.cintura),
    cinturaAjustado: s(t.cinturaAjustado),
    cinturaAncho: s(t.cinturaAncho),
    base: s(t.base),
    baseAjustado: s(t.baseAjustado),
    baseAncho: s(t.baseAncho),
    largo: s(t.largo),
    mangaLarga: s(t.mangaLarga),
    mangaCorta: s(t.mangaCorta),
    escote: s(t.escote),
    cuelloNormal: s(t.cuelloNormal),
    cuelloCruce: s(t.cuelloCruce),
    brazo: s(t.brazo),
    puno: s(t.puno),
    entrepierna: s(t.entrepierna),
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
    if (!SIZE_VALUE_PATTERN.test(name)) {
      Alert.alert(
        "Formato inválido",
        'El nombre de la talla solo puede contener letras, números, espacios, "/" y "-".',
      );
      return;
    }
    const nums = {
      espalda: parseNum(values.espalda),
      hombro: parseNum(values.hombro),
      talleDelantero: parseNum(values.talleDelantero),
      talleTrasero: parseNum(values.talleTrasero),
      distancia: parseNum(values.distancia),
      separacion: parseNum(values.separacion),
      pechoAjustado: parseNum(values.pechoAjustado),
      pechoAncho: parseNum(values.pechoAncho),
      cintura: parseNum(values.cintura),
      cinturaAjustado: parseNum(values.cinturaAjustado),
      cinturaAncho: parseNum(values.cinturaAncho),
      base: parseNum(values.base),
      baseAjustado: parseNum(values.baseAjustado),
      baseAncho: parseNum(values.baseAncho),
      largo: parseNum(values.largo),
      mangaLarga: parseNum(values.mangaLarga),
      mangaCorta: parseNum(values.mangaCorta),
      escote: parseNum(values.escote),
      cuelloNormal: parseNum(values.cuelloNormal),
      cuelloCruce: parseNum(values.cuelloCruce),
      brazo: parseNum(values.brazo),
      puno: parseNum(values.puno),
      entrepierna: parseNum(values.entrepierna),
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Nombre */}
      <View style={styles.nameSection}>
        <Text style={styles.fieldLabel}>
          Nombre de la talla <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.nameInput, errors.name && styles.inputError]}
          placeholder='Ej: M, 38, "Talla única"'
          placeholderTextColor={colors.textPlaceholder}
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
          placeholderTextColor={colors.textPlaceholder}
          multiline
          numberOfLines={3}
          value={watch("notes")}
          onChangeText={(v) => setValue("notes", v)}
        />
      </View>

      {/* Botones */}
      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          isSubmitting && styles.btnDisabled,
          pressed && !isSubmitting ? styles.saveBtnPressed : null,
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
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
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
      <MeasurementGridSection title="Medidas">
        <MeasurementCard<TallaFormValues>
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
        />
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
        <MeasurementGroupCard<TallaFormValues>
          title="Pecho"
          fields={[
            {
              name: "pechoAjustado",
              label: "Ajustado",
              accessibilityLabel: "Pecho ajustado (cm)",
              errorMessage: errors.pechoAjustado?.message,
            },
            {
              name: "pechoAncho",
              label: "Ancho",
              accessibilityLabel: "Pecho ancho (cm)",
              errorMessage: errors.pechoAncho?.message,
            },
          ]}
          control={control}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Cintura"
          fields={[
            {
              name: "cinturaAjustado",
              label: "Ajustado",
              accessibilityLabel: "Cintura ajustado (cm)",
              errorMessage: errors.cinturaAjustado?.message,
            },
            {
              name: "cinturaAncho",
              label: "Ancho",
              accessibilityLabel: "Cintura ancho (cm)",
              errorMessage: errors.cinturaAncho?.message,
            },
          ]}
          control={control}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Base"
          fields={[
            {
              name: "baseAjustado",
              label: "Ajustado",
              accessibilityLabel: "Base ajustado (cm)",
              errorMessage: errors.baseAjustado?.message,
            },
            {
              name: "baseAncho",
              label: "Ancho",
              accessibilityLabel: "Base ancho (cm)",
              errorMessage: errors.baseAncho?.message,
            },
          ]}
          control={control}
        />
        <MeasurementCard<TallaFormValues>
          name="hombro"
          label="Hombro"
          accessibilityLabel="Hombro (cm)"
          control={control}
          errorMessage={errors.hombro?.message}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Manga"
          fields={[
            {
              name: "mangaLarga",
              label: "Largo manga larga",
              accessibilityLabel: "Largo manga larga (cm)",
              errorMessage: errors.mangaLarga?.message,
            },
            {
              name: "mangaCorta",
              label: "Largo manga corta",
              accessibilityLabel: "Largo manga corta (cm)",
              errorMessage: errors.mangaCorta?.message,
            },
            {
              name: "brazo",
              label: "Brazo",
              accessibilityLabel: "Brazo (cm)",
              errorMessage: errors.brazo?.message,
            },
            {
              name: "puno",
              label: "Puño",
              accessibilityLabel: "Puño (cm)",
              errorMessage: errors.puno?.message,
            },
          ]}
          control={control}
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
        <MeasurementCard<TallaFormValues>
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Cuello"
          fields={[
            {
              name: "cuelloNormal",
              label: "Normal",
              accessibilityLabel: "Cuello normal (cm)",
              errorMessage: errors.cuelloNormal?.message,
            },
            {
              name: "cuelloCruce",
              label: "Cruce",
              accessibilityLabel: "Cuello cruce (cm)",
              errorMessage: errors.cuelloCruce?.message,
            },
          ]}
          control={control}
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
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="entrepierna"
          label="Entrepierna"
          accessibilityLabel="Entrepierna (cm)"
          control={control}
          errorMessage={errors.entrepierna?.message}
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
          label="Cadera"
          accessibilityLabel="Cadera (cm)"
          control={control}
          errorMessage={errors.base?.message}
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
        <MeasurementCard<TallaFormValues>
          name="pierna"
          label="Pierna"
          accessibilityLabel="Pierna (cm)"
          control={control}
          errorMessage={errors.pierna?.message}
        />
        <MeasurementCard<TallaFormValues>
          name="tiro"
          label="Tiro"
          accessibilityLabel="Tiro (cm)"
          control={control}
          errorMessage={errors.tiro?.message}
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
        <MeasurementGroupCard<TallaFormValues>
          title="Pecho"
          fields={[
            {
              name: "pechoAjustado",
              label: "Ajustado",
              accessibilityLabel: "Pecho ajustado (cm)",
              errorMessage: errors.pechoAjustado?.message,
            },
            {
              name: "pechoAncho",
              label: "Ancho",
              accessibilityLabel: "Pecho ancho (cm)",
              errorMessage: errors.pechoAncho?.message,
            },
          ]}
          control={control}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Cintura"
          fields={[
            {
              name: "cinturaAjustado",
              label: "Ajustado",
              accessibilityLabel: "Cintura ajustado (cm)",
              errorMessage: errors.cinturaAjustado?.message,
            },
            {
              name: "cinturaAncho",
              label: "Ancho",
              accessibilityLabel: "Cintura ancho (cm)",
              errorMessage: errors.cinturaAncho?.message,
            },
          ]}
          control={control}
        />
        <MeasurementGroupCard<TallaFormValues>
          title="Base"
          fields={[
            {
              name: "baseAjustado",
              label: "Ajustado",
              accessibilityLabel: "Base ajustado (cm)",
              errorMessage: errors.baseAjustado?.message,
            },
            {
              name: "baseAncho",
              label: "Ancho",
              accessibilityLabel: "Base ancho (cm)",
              errorMessage: errors.baseAncho?.message,
            },
          ]}
          control={control}
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
    backgroundColor: colors.background,
  },
  nameSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: colors.danger,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  gridWrapper: {
    gap: 12,
  },
  notesSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 72,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnPressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
