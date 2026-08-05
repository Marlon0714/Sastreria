import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  MeasurementNotesField,
  MeasurementNumberField,
} from "./MeasurementFields";

export interface CamisaFormValues {
  espalda: string;
  talleDelantero: string;
  talleTrasero: string;
  largo: string;
  pechoAjustado: string;
  pechoAncho: string;
  cinturaAjustado: string;
  cinturaAncho: string;
  baseAjustado: string;
  baseAncho: string;
  hombro: string;
  largoManga: string;
  anchoManga: string;
  brazo: string;
  puno: string;
  distancia: string;
  separacion: string;
  escote: string;
  cuelloNormal: string;
  cuelloCruce: string;
  notes: string;
}

export const CAMISA_FORM_DEFAULTS: CamisaFormValues = {
  espalda: "",
  talleDelantero: "",
  talleTrasero: "",
  largo: "",
  pechoAjustado: "",
  pechoAncho: "",
  cinturaAjustado: "",
  cinturaAncho: "",
  baseAjustado: "",
  baseAncho: "",
  hombro: "",
  largoManga: "",
  anchoManga: "",
  brazo: "",
  puno: "",
  distancia: "",
  separacion: "",
  escote: "",
  cuelloNormal: "",
  cuelloCruce: "",
  notes: "",
};

interface CamisaMeasurementFormProps {
  control: Control<CamisaFormValues>;
  errors: FieldErrors<CamisaFormValues>;
  /** True en modo vista (Detail), false en modo edición (Create o edit). */
  disabled?: boolean;
}

/**
 * Formulario reutilizable para medidas de camisa (20 campos + notas).
 * Usado por `CamisaMeasurementDetailScreen` (crea o edita según haya medidas).
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
        name="largo"
        label="Largo (cm)"
        control={control}
        errorMessage={errors.largo?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="pechoAjustado"
        label="Pecho ajustado (cm)"
        control={control}
        errorMessage={errors.pechoAjustado?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="pechoAncho"
        label="Pecho ancho (cm)"
        control={control}
        errorMessage={errors.pechoAncho?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="cinturaAjustado"
        label="Cintura ajustado (cm)"
        control={control}
        errorMessage={errors.cinturaAjustado?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="cinturaAncho"
        label="Cintura ancho (cm)"
        control={control}
        errorMessage={errors.cinturaAncho?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="baseAjustado"
        label="Base ajustado (cm)"
        control={control}
        errorMessage={errors.baseAjustado?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="baseAncho"
        label="Base ancho (cm)"
        control={control}
        errorMessage={errors.baseAncho?.message}
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
        name="brazo"
        label="Brazo (cm)"
        control={control}
        errorMessage={errors.brazo?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="puno"
        label="Puño (cm)"
        control={control}
        errorMessage={errors.puno?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="distancia"
        label="Distancia entre pezones (cm)"
        control={control}
        errorMessage={errors.distancia?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="separacion"
        label="Separación de sisa (cm)"
        control={control}
        errorMessage={errors.separacion?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="escote"
        label="Escote (cm)"
        control={control}
        errorMessage={errors.escote?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="cuelloNormal"
        label="Cuello normal (cm)"
        control={control}
        errorMessage={errors.cuelloNormal?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="cuelloCruce"
        label="Cuello cruce (cm)"
        control={control}
        errorMessage={errors.cuelloCruce?.message}
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
