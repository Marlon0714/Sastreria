import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { colors } from "../../../shared/theme/colors";
import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import { resolveClientContact } from "../../schedule/domain/clientContact";
import type { Schedule } from "../../schedule/domain/types";
import { buildArregloLabelData } from "../domain/arregloLabelData";
import type { PrinterTarget } from "../domain/types";
import { useArregloLabelCapture } from "../hooks/useArregloLabelCapture";
import { usePrintArregloLabel } from "../hooks/usePrintArregloLabel";
import { ArregloLabelView } from "./ArregloLabelView";

interface PrintArregloLabelButtonProps {
  schedule: Schedule;
  /**
   * Cliente ya resuelto por quien renderiza el botón (ej.
   * `ScheduleDayViewScreen` ya mantiene `clientsById`). Si no viene (ya sea
   * `undefined` o `null`, ver el efecto de abajo) y el turno tiene
   * `clientId`, el propio botón lo resuelve por su cuenta — así
   * `ScheduleFormScreen` puede usarlo sin tener que cargar el cliente él
   * mismo solo para esto.
   */
  client?: Client | null;
}

/**
 * Botón para imprimir la etiqueta física de un turno "arreglo" (nombre +
 * teléfono del cliente, fecha, precio/saldo — sin descripción de prenda ni
 * QR). Solo se muestra para `category === "arreglo"`; para "confeccion"
 * no renderiza nada.
 *
 * La vista de la etiqueta (`ArregloLabelView`) se monta siempre fuera de
 * pantalla (no condicionada a "imprimiendo") para que ya esté lista con
 * layout calculado en el momento en que el usuario presiona imprimir.
 */
export function PrintArregloLabelButton({
  schedule,
  client,
}: PrintArregloLabelButtonProps): ReactElement | null {
  const clientRepository = useClientRepository();
  const printers = usePrinterSettingsStore((state) => state.printers);
  const { viewRef, onLayout, capture } = useArregloLabelCapture();
  const { isPrinting, printLabel } = usePrintArregloLabel();
  const [resolvedClient, setResolvedClient] = useState<Client | null>(client ?? null);

  useEffect(() => {
    if (client) {
      setResolvedClient(client);
      return;
    }
    if (!schedule.clientId) {
      setResolvedClient(null);
      return;
    }

    let cancelled = false;
    clientRepository
      .findById(schedule.clientId)
      .then((found) => {
        if (!cancelled) {
          setResolvedClient(found);
        }
      })
      .catch((error: unknown) => {
        console.error(
          JSON.stringify({
            level: "error",
            service: "PrintArregloLabelButton",
            message: "No se pudo resolver el cliente para la etiqueta de arreglo",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [client, schedule.clientId, clientRepository]);

  const clientsById = useMemo(() => {
    const map = new Map<string, Client>();
    if (resolvedClient) {
      map.set(resolvedClient.id, resolvedClient);
    }
    return map;
  }, [resolvedClient]);

  const contact = resolveClientContact(schedule, clientsById);
  const label = buildArregloLabelData(schedule, contact);

  const printToTarget = async (target: PrinterTarget): Promise<void> => {
    try {
      await printLabel({ capture, target });
    } catch (error) {
      Alert.alert(
        "No se pudo imprimir",
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Intenta de nuevo.",
      );
      console.error(
        JSON.stringify({
          level: "error",
          service: "PrintArregloLabelButton",
          message: "Fallo al imprimir etiqueta de arreglo",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handlePrintPress = (): void => {
    if (printers.length === 0) {
      Alert.alert(
        "No hay impresoras configuradas",
        "Ve a Mi cuenta > Impresoras para agregar una impresora antes de imprimir.",
      );
      return;
    }

    if (printers.length === 1) {
      void printToTarget(printers[0]!);
      return;
    }

    Alert.alert("Elegir impresora", "¿En cuál impresora deseas imprimir esta etiqueta?", [
      ...printers.map((printer) => ({
        text: printer.name,
        onPress: () => void printToTarget(printer),
      })),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  if (schedule.category !== "arreglo") {
    return null;
  }

  return (
    <View>
      <View style={styles.offscreen} pointerEvents="none">
        <ArregloLabelView ref={viewRef} label={label} onLayout={onLayout} />
      </View>

      <Pressable
        accessibilityLabel="Imprimir etiqueta"
        style={[styles.button, isPrinting && styles.buttonDisabled]}
        onPress={handlePrintPress}
        disabled={isPrinting}
      >
        {isPrinting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Ionicons name="print-outline" size={18} color="#ffffff" />
        )}
        <Text style={styles.buttonText}>
          {isPrinting ? "Imprimiendo…" : "Imprimir etiqueta"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    top: -9999,
    left: -9999,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
