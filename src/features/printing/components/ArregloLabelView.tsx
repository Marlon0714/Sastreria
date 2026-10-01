import { forwardRef } from "react";
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { formatPrice } from "../../pricing/domain/strings";
import { formatDateForDisplay } from "../../schedule/domain/dateUtils";
import { ARREGLO_LABEL_WIDTH_PX, type ArregloLabelData } from "../domain/types";

interface ArregloLabelViewProps {
  label: ArregloLabelData;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Nombre/leyenda del negocio en el encabezado de la etiqueta — branding fijo
 * (no viaja en `ArregloLabelData` porque no varía por etiqueta impresa, a
 * diferencia del nombre del cliente).
 */
const BUSINESS_NAME = "Eduar Espinosa";
const BUSINESS_SUBTITLE = "SASTRERÍA";

function Divider(): React.ReactElement {
  return <View style={styles.divider} />;
}

/**
 * Vista puramente presentacional de la etiqueta de arreglo — se captura con
 * `react-native-view-shot` (`useArregloLabelCapture`) para convertirla en un
 * bitmap que termina impreso. Ancho fijo en `ARREGLO_LABEL_WIDTH_PX` para
 * que coincida con el ancho de impresión asumido por `escposRaster.ts`.
 *
 * Layout diseñado en Figma por el dueño (logo + líneas divisorias + caja de
 * saldo), con los dos íconos exportados como PNG en `assets/label/`.
 *
 * A propósito NO muestra descripción de la prenda ni ningún código/QR.
 */
export const ArregloLabelView = forwardRef<View, ArregloLabelViewProps>(
  function ArregloLabelView({ label, onLayout }, ref) {
    const hasTotalRow = label.price != null || label.abono != null;

    return (
      <View ref={ref} style={styles.container} collapsable={false} onLayout={onLayout}>
        <View style={styles.header}>
          {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
          <Image source={require("../../../../assets/label/icono-tijeras.png")} style={styles.headerIcon} resizeMode="contain" />
          <View style={styles.headerTitle}>
            <Text style={styles.businessName}>{BUSINESS_NAME}</Text>
            <Text style={styles.businessSubtitle}>{BUSINESS_SUBTITLE}</Text>
          </View>
          {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
          <Image
            source={require("../../../../assets/label/emblema-monograma.png")}
            style={styles.headerEmblem}
            resizeMode="contain"
          />
        </View>
        <Divider />

        <Text style={styles.sectionLabel}>CLIENTE</Text>
        <Text style={styles.clientName}>{label.clientName}</Text>
        {label.clientPhone ? <Text style={styles.text}>Tel. {label.clientPhone}</Text> : null}

        {label.date ? (
          <>
            <Divider />
            <View style={styles.row}>
              <Text style={styles.sectionLabel}>ENTREGA</Text>
              <Text style={styles.rowValue}>{formatDateForDisplay(label.date)}</Text>
            </View>
          </>
        ) : null}

        {hasTotalRow ? (
          <>
            <Divider />
            <View style={styles.row}>
              {label.price != null ? (
                <View style={styles.amountColumn}>
                  <Text style={styles.sectionLabel}>Total</Text>
                  <Text style={styles.amountValue}>{formatPrice(label.price)}</Text>
                </View>
              ) : null}
              {label.price != null && label.abono != null ? (
                <View style={styles.verticalDivider} />
              ) : null}
              {label.abono != null ? (
                <View style={styles.amountColumn}>
                  <Text style={styles.sectionLabel}>Abono</Text>
                  <Text style={styles.amountValue}>{formatPrice(label.abono)}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {label.saldo != null ? (
          <View style={styles.saldoBox}>
            <Text style={styles.saldoLabel}>SALDO</Text>
            <Text style={styles.saldoValue}>{formatPrice(label.saldo)}</Text>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 4,
  },
  headerIcon: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerEmblem: {
    width: 44,
    height: 44,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  businessSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 1,
    textAlign: "center",
  },
  divider: {
    height: 2,
    backgroundColor: "#000000",
    marginVertical: 6,
  },
  verticalDivider: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: "#000000",
    marginHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  text: {
    fontSize: 14,
    color: "#000000",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  amountColumn: {
    flex: 1,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  saldoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  saldoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    textTransform: "uppercase",
  },
  saldoValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#000000",
  },
});
