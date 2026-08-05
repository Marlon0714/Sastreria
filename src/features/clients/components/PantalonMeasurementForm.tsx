import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  MeasurementNotesField,
  MeasurementNumberField,
} from "./MeasurementFields";

export interface PantalonFormValues {
  largo: string;
  entrepierna: string;
  cintura: string;
  base: string;
  rodilla: string;
  bota: string;
  pierna: string;
  tiro: string;
  notes: string;
}

export const PANTALON_FORM_DEFAULTS: PantalonFormValues = {
  largo: "",
  entrepierna: "",
  cintura: "",
  base: "",
  rodilla: "",
  bota: "",
  pierna: "",
  tiro: "",
  notes: "",
};

interface PantalonMeasurementFormProps {
  control: Control<PantalonFormValues>;
  errors: FieldErrors<PantalonFormValues>;
  /** True en modo vista (Detail), false en modo edición. */
  disabled?: boolean;
}

/**
 * Formulario reutilizable para medidas de pantalón (8 campos + notas).
 * Usado por `PantalonMeasurementDetailScreen` (crea o edita según haya medidas).
 */
export default function PantalonMeasurementForm({
  control,
  errors,
  disabled = false,
}: PantalonMeasurementFormProps) {
  return (
    <View style={styles.container}>
      <MeasurementNumberField
        name="largo"
        label="Largo (cm)"
        control={control}
        errorMessage={errors.largo?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="entrepierna"
        label="Entrepierna (cm)"
        control={control}
        errorMessage={errors.entrepierna?.message}
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
        name="rodilla"
        label="Rodilla (cm)"
        control={control}
        errorMessage={errors.rodilla?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="bota"
        label="Bota (cm)"
        control={control}
        errorMessage={errors.bota?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="pierna"
        label="Pierna (cm)"
        control={control}
        errorMessage={errors.pierna?.message}
        disabled={disabled}
      />
      <MeasurementNumberField
        name="tiro"
        label="Tiro (cm)"
        control={control}
        errorMessage={errors.tiro?.message}
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
