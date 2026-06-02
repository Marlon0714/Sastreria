import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { type ChalecoFormValues } from "./ChalecoMeasurementForm";
import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";

interface ChalecoMeasurementGridProps {
  control: Control<ChalecoFormValues>;
  errors: FieldErrors<ChalecoFormValues>;
  disabled?: boolean;
}

export default function ChalecoMeasurementGrid({
  control,
  errors,
  disabled = false,
}: ChalecoMeasurementGridProps) {
  return (
    <View style={styles.container}>
      <MeasurementGridSection title="Chaleco">
        <MeasurementCard
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="talleTrasero"
          label="Talle trasero"
          accessibilityLabel="Talle trasero (cm)"
          control={control}
          errorMessage={errors.talleTrasero?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="largo"
          label="Largo"
          accessibilityLabel="Largo (cm)"
          control={control}
          errorMessage={errors.largo?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="pecho"
          label="Pecho"
          accessibilityLabel="Pecho (cm)"
          control={control}
          errorMessage={errors.pecho?.message}
          disabled={disabled}
        />
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
          label="Base o cadera"
          accessibilityLabel="Base o cadera (cm)"
          control={control}
          errorMessage={errors.base?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
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
    gap: 18,
  },
});
