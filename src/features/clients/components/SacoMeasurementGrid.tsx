import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { type SacoFormValues } from "./SacoMeasurementForm";
import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";
import { MeasurementGroupCard } from "./MeasurementGroupCard";

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
        <MeasurementGroupCard
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
          disabled={disabled}
        />
        <MeasurementGroupCard
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
          disabled={disabled}
        />
        <MeasurementGroupCard
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
        <MeasurementGroupCard
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
        <MeasurementGroupCard
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
