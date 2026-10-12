import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import { LabelPreviewModal } from "./LabelPreviewModal";

interface PrintArregloLabelButtonProps {
  schedule: Schedule;
  /** Solicita abrir el flujo de impresión justo después de guardar el arreglo. */
  requestPrint?: string;
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
  requestPrint,
}: PrintArregloLabelButtonProps): ReactElement | null {
  const clientRepository = useClientRepository();
  const printers = usePrinterSettingsStore((state) => state.printers);
  const defaultPrinterId = usePrinterSettingsStore(
    (state) => state.defaultPrinterId,
  );
  const isHydrating = usePrinterSettingsStore((state) => state.isHydrating);
  const hydratePrinters = usePrinterSettingsStore((state) => state.hydrate);
  const { viewRef, onLayout, capture } = useArregloLabelCapture();
  const { isPrinting, printLabel } = usePrintArregloLabel();
  const [resolvedClient, setResolvedClient] = useState<Client | null>(
    client ?? null,
  );
  const [pendingTarget, setPendingTarget] = useState<PrinterTarget | null>(
    null,
  );
  const [inverted, setInverted] = useState(false);
  const attempts = useRef(0);
  const handledRequest = useRef<string | null>(null);

  useEffect(() => {
    void hydratePrinters();
  }, [hydratePrinters]);

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
            message:
              "No se pudo resolver el cliente para la etiqueta de arreglo",
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

  const choosePrinter = useCallback((): void => {
    Alert.alert(
      "Elegir impresora",
      "¿En cuál impresora deseas imprimir esta etiqueta?",
      [
        ...printers.map((printer) => ({
          text: printer.name,
          onPress: () => setPendingTarget(printer),
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  }, [printers]);

  const handlePrintPress = useCallback((): void => {
    if (isHydrating) {
      Alert.alert(
        "Cargando impresoras",
        "Espera un momento mientras se actualiza la configuración compartida.",
      );
      return;
    }
    attempts.current = 0;
    setInverted(false);
    if (printers.length === 0) {
      Alert.alert(
        "No hay impresoras configuradas",
        "Ve a Mi cuenta > Impresoras para agregar una impresora antes de imprimir.",
      );
      return;
    }

    const preferred = printers.find(
      (printer) => printer.id === defaultPrinterId,
    );
    if (preferred || printers.length === 1) {
      setPendingTarget(preferred ?? printers[0]!);
      return;
    }

    choosePrinter();
  }, [choosePrinter, defaultPrinterId, isHydrating, printers]);

  const printToTarget = useCallback(
    async (target: PrinterTarget): Promise<boolean> => {
      const sendAttempt = async (): Promise<boolean> => {
        if (attempts.current >= 3) {
          Alert.alert(
            "Límite de intentos alcanzado",
            "Ya se hicieron 3 intentos en este envío. Revisa la conexión o inicia una nueva impresión desde el botón de la etiqueta.",
            [{ text: "Cerrar", onPress: () => setPendingTarget(null) }],
          );
          return false;
        }
        const current = usePrinterSettingsStore
          .getState()
          .printers.find((printer) => printer.id === target.id);
        if (!current) {
          setPendingTarget(null);
          Alert.alert(
            "Impresora no disponible",
            "La impresora ya no está configurada en este dispositivo.",
          );
          return false;
        }
        if (
          current.host !== target.host ||
          current.port !== target.port ||
          current.protocol !== target.protocol ||
          current.labelWidthMm !== target.labelWidthMm ||
          current.labelLengthMm !== target.labelLengthMm
        ) {
          setPendingTarget(current);
          Alert.alert(
            "Configuración actualizada",
            "Revisa la impresora y confirma de nuevo antes de enviar.",
          );
          return false;
        }

        attempts.current += 1;
        const attempt = attempts.current;
        try {
          await printLabel({
            capture,
            target: current,
            jobKey: schedule.id,
            invertColors: inverted,
          });
          return true;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Error inesperado al preparar o enviar la etiqueta.";
          Alert.alert(
            "No se pudo imprimir",
            `${message}\n\nIntento ${attempt} de 3. La conexión TCP no confirma que la etiqueta haya salido.`,
            [
              ...(attempt < 3
                ? [
                    {
                      text: "Reintentar",
                      onPress: () => {
                        void sendAttempt().then((succeeded) => {
                          if (succeeded) setPendingTarget(null);
                        });
                      },
                    },
                  ]
                : []),
              ...(attempt < 3
                ? [
                    {
                      text: "Elegir impresora",
                      onPress: choosePrinter,
                    },
                  ]
                : [
                    {
                      text: "Revisar conexión",
                      onPress: () =>
                        Alert.alert(
                          "Revisar conexión",
                          "Comprueba el Wi-Fi del taller, la IP y puerto 9100 de la impresora, el protocolo configurado y su alimentación. TCP no permite conocer el estado del papel.",
                        ),
                    },
                  ]),
              {
                text: "Más tarde",
                style: "cancel" as const,
                onPress: () => setPendingTarget(null),
              },
            ],
          );
          console.error(
            JSON.stringify({
              level: "error",
              service: "PrintArregloLabelButton",
              message: "Fallo al enviar etiqueta de arreglo",
              attempt,
            }),
          );
          return false;
        }
      };
      return sendAttempt();
    },
    [capture, choosePrinter, inverted, printLabel, schedule.id],
  );

  const handleConfirmPrint = useCallback(async (): Promise<void> => {
    if (!pendingTarget) {
      return;
    }
    if (await printToTarget(pendingTarget)) setPendingTarget(null);
  }, [pendingTarget, printToTarget]);

  useEffect(() => {
    if (
      requestPrint &&
      requestPrint === schedule.id &&
      !isHydrating &&
      handledRequest.current !== requestPrint
    ) {
      handledRequest.current = requestPrint;
      handlePrintPress();
    }
  }, [handlePrintPress, isHydrating, requestPrint, schedule.id]);

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
        style={[
          styles.button,
          (isPrinting || isHydrating) && styles.buttonDisabled,
        ]}
        onPress={handlePrintPress}
        disabled={isPrinting || isHydrating}
      >
        {isPrinting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Ionicons name="print-outline" size={18} color="#ffffff" />
        )}
        <Text style={styles.buttonText}>
          {isPrinting
            ? "Imprimiendo…"
            : isHydrating
              ? "Cargando impresoras…"
              : "Imprimir etiqueta"}
        </Text>
      </Pressable>

      <LabelPreviewModal
        visible={pendingTarget !== null}
        label={label}
        targetName={pendingTarget?.name}
        inverted={inverted}
        onToggleInverted={setInverted}
        isConfirming={isPrinting}
        onConfirm={handleConfirmPrint}
        onChooseTarget={printers.length > 1 ? choosePrinter : undefined}
        onClose={() => {
          if (!isPrinting) {
            setPendingTarget(null);
          }
        }}
      />
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
