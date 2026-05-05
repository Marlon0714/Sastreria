import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";
import { type PantalonFormValues } from "./PantalonMeasurementForm";

interface PantalonMeasurementGridProps {
  control: Control<PantalonFormValues>;
  errors: FieldErrors<PantalonFormValues>;
  disabled?: boolean;
}

export default function PantalonMeasurementGrid({
  control,
  errors,
  disabled = false,
}: PantalonMeasurementGridProps) {
  return (
    <View style={styles.container}>
      <MeasurementGridSection title="Longitud">
        <MeasurementCard
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="pierna"
          label="Pierna"
          accessibilityLabel="Pierna (cm)"
          control={control}
          errorMessage={errors.pierna?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="rodilla"
          label="Rodilla"
          accessibilityLabel="Rodilla (cm)"
          control={control}
          errorMessage={errors.rodilla?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="bota"
          label="Bota"
          accessibilityLabel="Bota (cm)"
          control={control}
          errorMessage={errors.bota?.message}
          disabled={disabled}
        />
      </MeasurementGridSection>

      <MeasurementGridSection title="Contorno">
        <MeasurementCard
          name="cintura"
          label="Cintura"
          accessibilityLabel="Cintura (cm)"
          control={control}
          errorMessage={errors.cintura?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="base"
          label="Base"
          accessibilityLabel="Base (cm)"
          control={control}
          errorMessage={errors.base?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="tiro"
          label="Tiro"
          accessibilityLabel="Tiro (cm)"
          control={control}
          errorMessage={errors.tiro?.message}
          disabled={disabled}
        />
      </MeasurementGridSection>

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
    gap: 16,
  },
});
