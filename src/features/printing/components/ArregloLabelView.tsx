import { forwardRef } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { formatPrice } from "../../pricing/domain/strings";
import { formatDateForDisplay } from "../../schedule/domain/dateUtils";
import {
  ARREGLO_LABEL_CANVAS_HEIGHT_PX,
  ARREGLO_LABEL_CANVAS_WIDTH_PX,
  type ArregloLabelData,
} from "../domain/types";

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
 * bitmap que termina impreso. Lienzo fijo en dots (ver
 * `ARREGLO_LABEL_CANVAS_WIDTH_PX`) con la proporción física de la etiqueta.
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
      <View
        ref={ref}
        style={styles.container}
        collapsable={false}
        onLayout={onLayout}
      >
        <View style={styles.header}>
          <Image
            source={require("../../../../assets/label/icono-traje.png")}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <View style={styles.headerTitle}>
            <Text
              style={styles.businessName}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {BUSINESS_NAME}
            </Text>
            <Text
              style={styles.businessSubtitle}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {BUSINESS_SUBTITLE}
            </Text>
          </View>
          <Image
            source={require("../../../../assets/label/emblema-monograma.png")}
            style={styles.headerEmblem}
            resizeMode="contain"
          />
        </View>
        <Divider />

        <View>
          <Text style={styles.sectionLabel}>CLIENTE</Text>
          <Text
            style={styles.clientName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {label.clientName}
          </Text>
          {label.clientPhone ? (
            <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>
              Tel. {label.clientPhone}
            </Text>
          ) : null}
        </View>

        {label.date ? (
          <>
            <Divider />
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>ENTREGA</Text>
              <Text
                style={styles.deliveryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatDateForDisplay(label.date)}
              </Text>
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
                  <Text
                    style={styles.amountValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatPrice(label.price)}
                  </Text>
                </View>
              ) : null}
              {label.price != null && label.abono != null ? (
                <View style={styles.verticalDivider} />
              ) : null}
              {label.abono != null ? (
                <View style={styles.amountColumn}>
                  <Text style={styles.sectionLabel}>Abono</Text>
                  <Text
                    style={styles.amountValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatPrice(label.abono)}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {label.saldo != null ? (
          <View style={styles.saldoBox}>
            <Text style={styles.saldoLabel}>SALDO</Text>
            <Text
              style={styles.saldoValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPrice(label.saldo)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: ARREGLO_LABEL_CANVAS_WIDTH_PX,
    height: ARREGLO_LABEL_CANVAS_HEIGHT_PX,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  header: {
    height: 116,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerIcon: {
    width: 116,
    height: 116,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerEmblem: {
    width: 110,
    height: 110,
  },
  businessName: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  businessSubtitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0,
    textAlign: "center",
  },
  divider: {
    height: 3,
    backgroundColor: "#000000",
  },
  verticalDivider: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: "#000000",
    marginHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  clientName: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    color: "#000000",
  },
  text: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
    color: "#000000",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deliveryRow: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliveryLabel: {
    width: 96,
    flexShrink: 0,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#000000",
  },
  deliveryValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#000000",
    textAlign: "right",
  },
  amountColumn: {
    flex: 1,
  },
  amountValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
    color: "#000000",
  },
  saldoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 3,
    borderColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  saldoLabel: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: "#000000",
    textTransform: "uppercase",
  },
  saldoValue: {
    flex: 1,
    marginLeft: 12,
    textAlign: "right",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    color: "#000000",
  },
});
