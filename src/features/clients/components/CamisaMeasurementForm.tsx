import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  MeasurementNotesField,
  MeasurementNumberField,
} from "./MeasurementFields";

export interface CamisaFormValues {
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
  notes: string;
}

export const CAMISA_FORM_DEFAULTS: CamisaFormValues = {
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
  notes: "",
};

interface CamisaMeasurementFormProps {
  control: Control<CamisaFormValues>;
  errors: FieldErrors<CamisaFormValues>;
  /** True en modo vista (Detail), false en modo edición (Create o edit). */
  disabled?: boolean;
}

/**
 * Formulario reutilizable para medidas de camisa (13 campos + notas).
 * Compartido entre `CamisaMeasurementCreateScreen` y `CamisaMeasurementDetailScreen`.
 */
export default function CamisaMeasurementForm({
  control,
  errors,
  disabled = false,
}: CamisaMeasurementFormProps) {
  return (
    <View style={styles.container}>
      <MeasurementNumberField
        name="espalda"
        label="Espalda (cm)"
        control={control}
        errorMessage={errors.espalda?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="hombro"
        label="Hombro (cm)"
        control={control}
        errorMessage={errors.hombro?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="talleDelantero"
        label="Talle delantero (cm)"
        control={control}
        errorMessage={errors.talleDelantero?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="talleTrasero"
        label="Talle trasero (cm)"
        control={control}
        errorMessage={errors.talleTrasero?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="distancia"
        label="Distancia (cm)"
        control={control}
        errorMessage={errors.distancia?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="separacion"
        label="Separación (cm)"
        control={control}
        errorMessage={errors.separacion?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="pecho"
        label="Pecho (cm)"
        control={control}
        errorMessage={errors.pecho?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="cintura"
        label="Cintura (cm)"
        control={control}
        errorMessage={errors.cintura?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="base"
        label="Base (cm)"
        control={control}
        errorMessage={errors.base?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="largo"
        label="Largo (cm)"
        control={control}
        errorMessage={errors.largo?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="largoManga"
        label="Largo manga (cm)"
        control={control}
        errorMessage={errors.largoManga?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="anchoManga"
        label="Ancho manga (cm)"
        control={control}
        errorMessage={errors.anchoManga?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="escote"
        label="Escote (cm)"
        control={control}
        errorMessage={errors.escote?.message}
        disabled={disabled}
      />
      <MeasurementNotesField
        name="notes"
        control={control}
        errorMessage={errors.notes?.message}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
