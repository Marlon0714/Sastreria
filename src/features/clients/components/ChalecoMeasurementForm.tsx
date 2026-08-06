import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  MeasurementNotesField,
  MeasurementNumberField,
} from "./MeasurementFields";

export interface ChalecoFormValues {
  espalda: string;
  talleTrasero: string;
  largo: string;
  pechoAjustado: string;
  pechoAncho: string;
  cinturaAjustado: string;
  cinturaAncho: string;
  baseAjustado: string;
  baseAncho: string;
  escote: string;
  notes: string;
}

export const CHALECO_FORM_DEFAULTS: ChalecoFormValues = {
  espalda: "",
  talleTrasero: "",
  largo: "",
  pechoAjustado: "",
  pechoAncho: "",
  cinturaAjustado: "",
  cinturaAncho: "",
  baseAjustado: "",
  baseAncho: "",
  escote: "",
  notes: "",
};

interface ChalecoMeasurementFormProps {
  control: Control<ChalecoFormValues>;
  errors: FieldErrors<ChalecoFormValues>;
  disabled?: boolean;
}

export function ChalecoMeasurementForm({
  control,
  errors,
  disabled = false,
}: ChalecoMeasurementFormProps) {
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
