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
  pecho: string;
  cintura: string;
  base: string;
  escote: string;
  notes: string;
}

export const CHALECO_FORM_DEFAULTS: ChalecoFormValues = {
  espalda: "",
  talleTrasero: "",
  largo: "",
  pecho: "",
  cintura: "",
  base: "",
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
        label="Base o cadera (cm)"
        control={control}
        errorMessage={errors.base?.message}
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
