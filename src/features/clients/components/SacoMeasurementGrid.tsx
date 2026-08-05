import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { type SacoFormValues } from "./SacoMeasurementForm";
import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";
import { MeasurementPairCard } from "./MeasurementPairCard";

interface SacoMeasurementGridProps {
  control: Control<SacoFormValues>;
  errors: FieldErrors<SacoFormValues>;
  disabled?: boolean;
}

export default function SacoMeasurementGrid({
  control,
  errors,
  disabled = false,
}: SacoMeasurementGridProps) {
  return (
    <View style={styles.container}>
      <MeasurementGridSection title="Medidas">
        <MeasurementCard
          name="espalda"
          label="Espalda"
          accessibilityLabel="Espalda (cm)"
          control={control}
          errorMessage={errors.espalda?.message}
          disabled={disabled}
        />
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
        <MeasurementPairCard
          title="Pecho"
          first={{
            name: "pechoAjustado",
            label: "Ajustado",
            accessibilityLabel: "Pecho ajustado (cm)",
            errorMessage: errors.pechoAjustado?.message,
          }}
          second={{
            name: "pechoAncho",
            label: "Ancho",
            accessibilityLabel: "Pecho ancho (cm)",
            errorMessage: errors.pechoAncho?.message,
          }}
          control={control}
          disabled={disabled}
        />
        <MeasurementPairCard
          title="Cintura"
          first={{
            name: "cinturaAjustado",
            label: "Ajustado",
            accessibilityLabel: "Cintura ajustado (cm)",
            errorMessage: errors.cinturaAjustado?.message,
          }}
          second={{
            name: "cinturaAncho",
            label: "Ancho",
            accessibilityLabel: "Cintura ancho (cm)",
            errorMessage: errors.cinturaAncho?.message,
          }}
          control={control}
          disabled={disabled}
        />
        <MeasurementPairCard
          title="Base"
          first={{
            name: "baseAjustado",
            label: "Ajustado",
            accessibilityLabel: "Base ajustado (cm)",
            errorMessage: errors.baseAjustado?.message,
          }}
          second={{
            name: "baseAncho",
            label: "Ancho",
            accessibilityLabel: "Base ancho (cm)",
            errorMessage: errors.baseAncho?.message,
          }}
          control={control}
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
        <MeasurementCard
          name="escote"
          label="Escote"
          accessibilityLabel="Escote (cm)"
          control={control}
          errorMessage={errors.escote?.message}
          disabled={disabled}
        />
        <MeasurementPairCard
          title="Cuello"
          first={{
            name: "cuelloNormal",
            label: "Normal",
            accessibilityLabel: "Cuello normal (cm)",
            errorMessage: errors.cuelloNormal?.message,
          }}
          second={{
            name: "cuelloCruce",
            label: "Cruce",
            accessibilityLabel: "Cuello cruce (cm)",
            errorMessage: errors.cuelloCruce?.message,
          }}
          control={control}
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
