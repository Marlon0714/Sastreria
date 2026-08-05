import type { Control, FieldErrors } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { type ChalecoFormValues } from "./ChalecoMeasurementForm";
import { MeasurementCard } from "./MeasurementCard";
import { MeasurementNotesField } from "./MeasurementFields";
import { MeasurementGridSection } from "./MeasurementGridSection";
import { MeasurementPairCard } from "./MeasurementPairCard";

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
