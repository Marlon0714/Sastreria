import { useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../../shared/theme/colors";
import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import { ArregloLabelView } from "../components/ArregloLabelView";
import { LabelPreviewModal } from "../components/LabelPreviewModal";
import { buildEscPosTextTestJob } from "../domain/escposRaster";
import { toMonochromeBitmap } from "../domain/monochromeBitmap";
import { DEFAULT_LABEL_PRINTER_PORT, PrinterConfigValidationError } from "../domain/printerConfig";
import { resolveLabelRenderer } from "../domain/printRenderer";
import { rotatePixelsClockwise90 } from "../domain/rotatePixels";
import type { ArregloLabelData, PrinterTarget } from "../domain/types";
import {
  useLabelBitmapDecoder,
  useLabelPrinterRepository,
} from "../hooks/PrintingDependenciesProvider";
import { useArregloLabelCapture } from "../hooks/useArregloLabelCapture";
import { usePrinterDiscovery } from "../hooks/usePrinterDiscovery";

/**
 * Datos de ejemplo (no un turno/cliente real) para el botón "Ver diseño de
 * etiqueta" — permite revisar cómo se ve la etiqueta sin depender de un
 * turno existente.
 */
const SAMPLE_ARREGLO_LABEL: ArregloLabelData = {
  clientName: "Ana Torres",
  clientPhone: "3001234567",
  date: "2026-09-29",
  price: 50000,
  abono: 20000,
  saldo: 30000,
};

/**
 * Primera pantalla de "ajustes" de la app (no existía ninguna hasta ahora):
 * lista + alta/baja de impresoras térmicas configuradas. Solo visible para el
 * dueño (ver fila "Impresoras" en `MyAccountScreen.tsx`).
 */
export default function PrinterSettingsScreen(): ReactElement {
  const printers = usePrinterSettingsStore((state) => state.printers);
  const addPrinter = usePrinterSettingsStore((state) => state.addPrinter);
  const removePrinter = usePrinterSettingsStore((state) => state.removePrinter);
  const labelPrinterRepository = useLabelPrinterRepository();
  const decodeLabelBitmap = useLabelBitmapDecoder();
  const {
    viewRef: sampleLabelViewRef,
    onLayout: sampleLabelOnLayout,
    capture: captureSampleLabel,
  } = useArregloLabelCapture();

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);
  const [testingAlternateImagePrinterId, setTestingAlternateImagePrinterId] = useState<
    string | null
  >(null);

  const {
    isScanning,
    results: discoveredHosts,
    error: discoveryError,
    progress: scanProgress,
    debugDetail: discoveryDebugDetail,
    scan,
  } = usePrinterDiscovery();
  const [hasScanned, setHasScanned] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);

  const handleScan = async (): Promise<void> => {
    await scan();
    setHasScanned(true);
  };

  const handleSelectDiscoveredHost = (discoveredHost: string): void => {
    setHost(discoveredHost);
    setPort(String(DEFAULT_LABEL_PRINTER_PORT));
  };

  const handleAdd = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await addPrinter({
        name,
        host,
        port: port.trim() === "" ? undefined : Number(port),
      });
      setName("");
      setHost("");
      setPort("");
    } catch (error) {
      const message =
        error instanceof PrinterConfigValidationError
          ? error.message
          : "No se pudo guardar la impresora. Intenta de nuevo.";
      Alert.alert("No se pudo guardar", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async (printer: PrinterTarget): Promise<void> => {
    setTestingPrinterId(printer.id);
    try {
      const job = buildEscPosTextTestJob([
        "PRUEBA DE IMPRESION",
        printer.name,
        `${printer.host}:${printer.port}`,
        "Si esto se lee bien,",
        "la conexion y la",
        "impresora funcionan.",
      ]);
      await labelPrinterRepository.printLabelJob(printer, job);
    } catch (error) {
      Alert.alert(
        "No se pudo enviar la prueba",
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Intenta de nuevo.",
      );
    } finally {
      setTestingPrinterId(null);
    }
  };

  /**
   * Diagnóstico temporal: manda la etiqueta de ejemplo forzando el comando
   * `ESC *` (bit-image) en vez del protocolo configurado en la impresora —
   * para aislar si una impresora que imprime símbolos en vez de la imagen
   * con `GS v 0` funciona mejor con este comando más viejo y universal. Ver
   * `PrintProtocol`/`printRenderer.ts`.
   */
  const handleTestAlternateImage = async (printer: PrinterTarget): Promise<void> => {
    setTestingAlternateImagePrinterId(printer.id);
    try {
      const captured = await captureSampleLabel();
      const decoded = decodeLabelBitmap(captured);
      const rotated = rotatePixelsClockwise90(decoded.pixels, decoded.width, decoded.height);
      const bitmap = toMonochromeBitmap(rotated.pixels, rotated.width, rotated.height);
      const job = resolveLabelRenderer("escpos-bitimage").render(bitmap, printer);
      await labelPrinterRepository.printLabelJob(printer, job);
    } catch (error) {
      Alert.alert(
        "No se pudo enviar la prueba",
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Intenta de nuevo.",
      );
    } finally {
      setTestingAlternateImagePrinterId(null);
    }
  };

  const handleRemove = (printer: PrinterTarget): void => {
    Alert.alert(
      "Eliminar impresora",
      `¿Seguro que deseas eliminar "${printer.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void removePrinter(printer.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.offscreen} pointerEvents="none">
        <ArregloLabelView
          ref={sampleLabelViewRef}
          label={SAMPLE_ARREGLO_LABEL}
          onLayout={sampleLabelOnLayout}
        />
      </View>

      <FlatList
        data={printers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          printers.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin impresoras configuradas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega la dirección IP y el puerto de cada impresora térmica de
              la red WiFi del taller.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.printerRow}>
            <View style={styles.printerInfo}>
              <Text style={styles.printerName}>{item.name}</Text>
              <Text style={styles.printerAddress}>
                {item.host}:{item.port}
              </Text>
            </View>
            <View style={styles.printerActions}>
              <Pressable
                accessibilityLabel={`Enviar prueba de texto a ${item.name}`}
                style={styles.testButton}
                onPress={() => void handleTestPrint(item)}
                disabled={testingPrinterId === item.id}
              >
                {testingPrinterId === item.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.testButtonText}>Probar</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityLabel={`Enviar prueba de imagen alterna a ${item.name}`}
                style={styles.testButton}
                onPress={() => void handleTestAlternateImage(item)}
                disabled={testingAlternateImagePrinterId === item.id}
              >
                {testingAlternateImagePrinterId === item.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.testButtonText}>Img. alterna</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityLabel={`Eliminar ${item.name}`}
                style={styles.removeButton}
                onPress={() => handleRemove(item)}
              >
                <Text style={styles.removeButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={styles.previewCard}>
        <Pressable
          accessibilityLabel="Ver diseño de etiqueta"
          style={styles.previewButton}
          onPress={() => setShowLabelPreview(true)}
        >
          <Text style={styles.previewButtonText}>Ver diseño de etiqueta</Text>
        </Pressable>
      </View>

      <LabelPreviewModal
        visible={showLabelPreview}
        label={SAMPLE_ARREGLO_LABEL}
        onClose={() => setShowLabelPreview(false)}
      />

      <View style={styles.discoveryCard}>
        <Pressable
          accessibilityLabel="Buscar impresoras en la red"
          style={[styles.searchButton, isScanning && styles.searchButtonDisabled]}
          onPress={() => void handleScan()}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.searchButtonText}>Buscar en la red</Text>
          )}
        </Pressable>

        {isScanning && scanProgress && (
          <Text style={styles.discoveryHint}>
            Buscando… revisadas {scanProgress.checked} de {scanProgress.total} direcciones
          </Text>
        )}

        {discoveryError && (
          <>
            <Text style={styles.discoveryError}>{discoveryError}</Text>
            {/* Detalle técnico temporal para depurar builds preview/producción
                sin acceso a Metro — quitar una vez verificado en hardware real. */}
            {discoveryDebugDetail && (
              <Text style={styles.discoveryDebugDetail}>Detalle técnico: {discoveryDebugDetail}</Text>
            )}
          </>
        )}

        {!isScanning && !discoveryError && hasScanned && discoveredHosts.length === 0 && (
          <Text style={styles.discoveryHint}>No se encontraron impresoras en la red.</Text>
        )}

        {!isScanning && !discoveryError && discoveredHosts.length > 0 && (
          <Text style={styles.discoveryHint}>
            Se {discoveredHosts.length === 1 ? "encontró 1 impresora" : `encontraron ${discoveredHosts.length} impresoras`} en la red:
          </Text>
        )}

        {discoveredHosts.map((discoveredHost) => (
          <Pressable
            key={discoveredHost}
            accessibilityLabel={`Usar impresora encontrada en ${discoveredHost}`}
            style={styles.discoveryResultRow}
            onPress={() => handleSelectDiscoveredHost(discoveredHost)}
          >
            <Text style={styles.discoveryResultText}>{discoveredHost}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Agregar impresora</Text>
        <TextInput
          accessibilityLabel="Nombre de la impresora"
          style={styles.input}
          placeholder="Ej: Mostrador"
          placeholderTextColor={colors.textPlaceholder}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          accessibilityLabel="Dirección IP de la impresora"
          style={styles.input}
          placeholder="Ej: 192.168.1.50"
          placeholderTextColor={colors.textPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          value={host}
          onChangeText={setHost}
        />
        <TextInput
          accessibilityLabel="Puerto de la impresora"
          style={styles.input}
          placeholder="9100 (por defecto)"
          placeholderTextColor={colors.textPlaceholder}
          keyboardType="numeric"
          value={port}
          onChangeText={setPort}
        />
        <Pressable
          accessibilityLabel="Guardar impresora"
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Guardando…" : "Agregar impresora"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offscreen: {
    position: "absolute",
    top: -9999,
    left: -9999,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  printerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  printerInfo: {
    gap: 2,
  },
  printerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  printerAddress: {
    fontSize: 13,
    color: colors.textMuted,
  },
  printerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: "center",
  },
  testButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 13,
  },
  previewCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  previewButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
  },
  previewButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  discoveryCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  searchButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 12,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  discoveryHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  discoveryError: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  discoveryDebugDetail: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  discoveryResultRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  discoveryResultText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  formCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
