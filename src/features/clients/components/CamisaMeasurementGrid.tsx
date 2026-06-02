import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { type CamisaFormValues } from "./CamisaMeasurementForm";
import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";

interface CamisaMeasurementGridProps {
  control: Control<CamisaFormValues>;
  errors: FieldErrors<CamisaFormValues>;
  disabled?: boolean;
}

export default function CamisaMeasurementGrid({
  control,
  errors,
  disabled = false,
}: CamisaMeasurementGridProps) {
  return (
    <View style={styles.container}>
      <MeasurementGridSection title="Torso">
        <MeasurementCard
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="hombro"
          label="Hombro"
          accessibilityLabel="Hombro (cm)"
          control={control}
          errorMessage={errors.hombro?.message}
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
          label="Base"
          accessibilityLabel="Base (cm)"
          control={control}
          errorMessage={errors.base?.message}
          disabled={disabled}
        />
      </MeasurementGridSection>

      <MeasurementGridSection title="Largo">
        <MeasurementCard
          name="talleDelantero"
          label="Talle delantero"
          accessibilityLabel="Talle delantero (cm)"
          control={control}
          errorMessage={errors.talleDelantero?.message}
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
          name="distancia"
          label="Distancia"
          accessibilityLabel="Distancia (cm)"
          control={control}
          errorMessage={errors.distancia?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="separacion"
          label="Separación"
          accessibilityLabel="Separación (cm)"
          control={control}
          errorMessage={errors.separacion?.message}
          disabled={disabled}
        />
      </MeasurementGridSection>

      <MeasurementGridSection title="Manga">
        <MeasurementCard
          name="largoManga"
          label="Largo manga"
          accessibilityLabel="Largo manga (cm)"
          control={control}
          errorMessage={errors.largoManga?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="anchoManga"
          label="Ancho manga"
          accessibilityLabel="Ancho manga (cm)"
          control={control}
          errorMessage={errors.anchoManga?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="brazo"
          label="Brazo"
          accessibilityLabel="Brazo (cm)"
          control={control}
          errorMessage={errors.brazo?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="puno"
          label="Puño"
          accessibilityLabel="Puño (cm)"
          control={control}
          errorMessage={errors.puno?.message}
          disabled={disabled}
        />
      </MeasurementGridSection>

      <MeasurementGridSection title="Cuello">
        <MeasurementCard
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
          disabled={disabled}
        />
        <MeasurementCard
          name="cuello"
          label="Cuello"
          accessibilityLabel="Cuello (cm)"
          control={control}
          errorMessage={errors.cuello?.message}
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
