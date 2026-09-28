import { forwardRef } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { formatPrice } from "../../pricing/domain/strings";
import { formatDateForDisplay } from "../../schedule/domain/dateUtils";
import { ARREGLO_LABEL_WIDTH_PX, type ArregloLabelData } from "../domain/types";

interface ArregloLabelViewProps {
  label: ArregloLabelData;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Vista puramente presentacional de la etiqueta de arreglo — se captura con
 * `react-native-view-shot` (`useArregloLabelCapture`) para convertirla en un
 * bitmap que termina impreso. Ancho fijo en `ARREGLO_LABEL_WIDTH_PX` para
 * que coincida con el ancho de impresión asumido por `escposRaster.ts`.
 *
 * A propósito NO muestra descripción de la prenda ni ningún código/QR.
 */
export const ArregloLabelView = forwardRef<View, ArregloLabelViewProps>(
  function ArregloLabelView({ label, onLayout }, ref) {
    return (
      <View ref={ref} style={styles.container} collapsable={false} onLayout={onLayout}>
        <Text style={styles.clientName}>{label.clientName}</Text>
        {label.clientPhone ? <Text style={styles.text}>{label.clientPhone}</Text> : null}
        {label.date ? (
          <Text style={styles.text}>{formatDateForDisplay(label.date)}</Text>
        ) : null}
        {label.price != null ? (
          <Text style={styles.text}>Precio: {formatPrice(label.price)}</Text>
        ) : null}
        {label.saldo != null ? (
          <Text style={styles.saldo}>Saldo: {formatPrice(label.saldo)}</Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: ARREGLO_LABEL_WIDTH_PX,
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  clientName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
  },
  text: {
    fontSize: 18,
    color: "#000000",
  },
  saldo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginTop: 4,
  },
});
