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
import { DEFAULT_LABEL_PRINTER_PORT, PrinterConfigValidationError } from "../domain/printerConfig";
import type { PrinterTarget } from "../domain/types";
import { usePrinterDiscovery } from "../hooks/usePrinterDiscovery";

/**
 * Primera pantalla de "ajustes" de la app (no existía ninguna hasta ahora):
 * lista + alta/baja de impresoras térmicas configuradas. Solo visible para el
 * dueño (ver fila "Impresoras" en `MyAccountScreen.tsx`).
 */
export default function PrinterSettingsScreen(): ReactElement {
  const printers = usePrinterSettingsStore((state) => state.printers);
  const addPrinter = usePrinterSettingsStore((state) => state.addPrinter);
  const removePrinter = usePrinterSettingsStore((state) => state.removePrinter);

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { isScanning, results: discoveredHosts, error: discoveryError, scan } =
    usePrinterDiscovery();
  const [hasScanned, setHasScanned] = useState(false);

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
            <Pressable
              accessibilityLabel={`Eliminar ${item.name}`}
              style={styles.removeButton}
              onPress={() => handleRemove(item)}
            >
              <Text style={styles.removeButtonText}>Eliminar</Text>
            </Pressable>
          </View>
        )}
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

        {discoveryError && <Text style={styles.discoveryError}>{discoveryError}</Text>}

        {!isScanning && !discoveryError && hasScanned && discoveredHosts.length === 0 && (
          <Text style={styles.discoveryHint}>No se encontraron impresoras en la red.</Text>
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
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 13,
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
