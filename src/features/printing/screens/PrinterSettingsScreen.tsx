import { useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { colors } from "../../../shared/theme/colors";
import { PinPromptModal } from "../../auth/components/PinPromptModal";
import { OfflineActorPickerModal } from "../../auth/components/OfflineActorPickerModal";
import { ReauthStep } from "../../account/components/ReauthStep";
import { ArregloLabelView } from "../components/ArregloLabelView";
import { LabelPreviewModal } from "../components/LabelPreviewModal";
import {
  printerFormSchema,
  type PrinterFormInput,
  type CreatePrinterConfigOutput,
} from "../domain/printerConfig";
import { DEFAULT_PRINT_PROTOCOL } from "../domain/printRenderer";
import {
  DEFAULT_LABEL_LENGTH_MM,
  DEFAULT_LABEL_WIDTH_MM,
  type ArregloLabelData,
  type PrintProtocol,
  type PrinterTarget,
} from "../domain/types";
import { useArregloLabelCapture } from "../hooks/useArregloLabelCapture";
import { usePrinterDiscovery } from "../hooks/usePrinterDiscovery";
import { usePrinterManagement } from "../hooks/usePrinterManagement";

const SAMPLE_LABEL: ArregloLabelData = { clientName: "PRUEBA DE IMPRESION" };
const PROTOCOL_OPTIONS: { value: PrintProtocol; label: string }[] = [
  { value: "tspl-bitmap", label: "TSPL" },
  { value: "escpos-raster", label: "ESC/POS" },
  { value: "escpos-bitimage", label: "ESC *" },
];
const EMPTY_FORM: PrinterFormInput = {
  name: "",
  host: "",
  port: "9100",
  labelWidthMm: "50",
  labelLengthMm: "70",
  protocol: "tspl-bitmap",
};
const INPUT_FIELDS = [
  { name: "name", label: "Nombre de la impresora", numeric: false },
  { name: "host", label: "Dirección IP de la impresora", numeric: false },
  { name: "port", label: "Puerto de la impresora", numeric: true },
  { name: "labelWidthMm", label: "Ancho de etiqueta (mm)", numeric: true },
  { name: "labelLengthMm", label: "Largo de etiqueta (mm)", numeric: true },
] as const;

export default function PrinterSettingsScreen(): ReactElement {
  const { viewRef, onLayout, capture } = useArregloLabelCapture();
  const management = usePrinterManagement(capture);
  const discovery = usePrinterDiscovery();
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [recoveryPrinter, setRecoveryPrinter] = useState<PrinterTarget | null>(
    null,
  );
  const [recoveryHost, setRecoveryHost] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [preview, setPreview] = useState(false);
  const form = useForm<PrinterFormInput, unknown, CreatePrinterConfigOutput>({
    resolver: zodResolver(printerFormSchema),
    defaultValues: EMPTY_FORM,
  });
  const disabled = management.isBusy || discovery.isScanning;

  const openEditor = async (printer?: PrinterTarget): Promise<void> => {
    if (!management.canManage && !(await management.authorizeAdministration()))
      return;
    management.cancelRecovery();
    setRecoveryPrinter(null);
    setAdvanced(false);
    form.reset(
      printer
        ? {
            name: printer.name,
            host: printer.host,
            port: String(printer.port),
            labelWidthMm: String(
              printer.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
            ),
            labelLengthMm: String(
              printer.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM,
            ),
            protocol: printer.protocol ?? DEFAULT_PRINT_PROTOCOL,
          }
        : EMPTY_FORM,
    );
    setEditor({ id: printer?.id });
  };

  const save = form.handleSubmit(async (values) => {
    if (await management.savePrinter(values, editor?.id)) {
      setEditor(null);
      form.reset(EMPTY_FORM);
    }
  });

  const remove = (printer: PrinterTarget): void => {
    Alert.alert(
      "Eliminar impresora",
      `¿Eliminar "${printer.name}" de este dispositivo?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void management.removePrinter(printer.id);
          },
        },
      ],
    );
  };

  const confirmRecovery = (): void => {
    Alert.alert(
      "Confirmar impresora",
      "¿La etiqueta de prueba salió en la impresora correcta?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: management.cancelRecovery,
        },
        {
          text: "Sí, guardar IP",
          onPress: () => {
            void management.confirmConnection().then((saved) => {
              if (saved) setRecoveryPrinter(null);
            });
          },
        },
      ],
    );
  };

  const scan = async (): Promise<void> => {
    await discovery.scan();
    setHasScanned(true);
  };
  const selectHost = (host: string): void => {
    management.cancelRecovery();
    if (recoveryPrinter) setRecoveryHost(host);
    else form.setValue("host", host, { shouldValidate: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.offscreen} pointerEvents="none">
        <ArregloLabelView
          ref={viewRef}
          label={SAMPLE_LABEL}
          onLayout={onLayout}
        />
      </View>
      <FlatList
        data={management.printers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.section}>
            <View style={styles.actions}>
              {(management.canManage || management.canAuthorizeOwner) && (
                <Pressable
                  accessibilityLabel="Agregar impresora"
                  style={styles.command}
                  disabled={disabled}
                  onPress={() => {
                    void openEditor();
                  }}
                >
                  <Ionicons
                    name="add-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.commandText}>Agregar impresora</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityLabel="Ver diseño de etiqueta"
                style={styles.command}
                onPress={() => setPreview(true)}
              >
                <Ionicons name="eye-outline" size={20} color={colors.primary} />
                <Text style={styles.commandText}>Vista previa</Text>
              </Pressable>
            </View>
            {management.error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {management.error}
              </Text>
            )}
            {management.isBusy && (
              <ActivityIndicator accessibilityLabel="Operación de impresora en curso" />
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Sin impresoras configuradas</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.printer}>
            <View style={styles.heading}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.detail}>
                  {item.host}:{item.port}
                </Text>
                <Text style={styles.detail}>
                  {item.protocol ?? DEFAULT_PRINT_PROTOCOL} ·{" "}
                  {item.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM} ×{" "}
                  {item.labelLengthMm ?? DEFAULT_LABEL_LENGTH_MM} mm
                </Text>
              </View>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={`Predeterminada ${item.name}`}
                accessibilityState={{
                  checked: management.defaultPrinterId === item.id,
                  disabled,
                }}
                disabled={disabled}
                style={styles.iconButton}
                onPress={() => {
                  void management.setDefaultPrinter(item.id);
                }}
              >
                <Ionicons
                  name={
                    management.defaultPrinterId === item.id
                      ? "star"
                      : "star-outline"
                  }
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            </View>
            {management.defaultPrinterId === item.id && (
              <Text style={styles.detail}>Predeterminada</Text>
            )}
            {management.testResult &&
              management.testResult.printerId === item.id && (
                <Text style={styles.detail}>
                  {management.testResult.status === "sent"
                    ? "Prueba enviada"
                    : "No se pudo enviar la prueba"}
                </Text>
              )}
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={`Imprimir prueba en ${item.name}`}
                style={styles.command}
                disabled={disabled}
                onPress={() => {
                  void management.sendTest(item);
                }}
              >
                <Ionicons
                  name="print-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.commandText}>Probar</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Resolver conexión de ${item.name}`}
                style={styles.command}
                disabled={disabled}
                onPress={() => {
                  setEditor(null);
                  management.cancelAdministration();
                  management.cancelRecovery();
                  setRecoveryPrinter(item);
                  setRecoveryHost(item.host);
                }}
              >
                <Ionicons
                  name="wifi-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.commandText}>Conexión</Text>
              </Pressable>
              {(management.canManage || management.canAuthorizeOwner) && (
                <Pressable
                  accessibilityLabel={`Editar ${item.name}`}
                  style={styles.iconButton}
                  disabled={disabled}
                  onPress={() => {
                    void openEditor(item);
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={colors.primary}
                  />
                </Pressable>
              )}
              {management.canManage && (
                <Pressable
                  accessibilityLabel={`Eliminar ${item.name}`}
                  style={styles.iconButton}
                  disabled={disabled}
                  onPress={() => remove(item)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {editor && management.canManage && (
              <View style={styles.section}>
                <Text style={styles.title}>
                  {editor.id ? "Editar impresora" : "Agregar impresora"}
                </Text>
                {INPUT_FIELDS.filter(
                  (field) =>
                    advanced || field.name === "name" || field.name === "host",
                ).map((input) => (
                  <View key={input.name} style={styles.field}>
                    <Text style={styles.detail}>{input.label}</Text>
                    <Controller
                      control={form.control}
                      name={input.name}
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          accessibilityLabel={input.label}
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          editable={!disabled}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType={input.numeric ? "numeric" : "default"}
                        />
                      )}
                    />
                    {form.formState.errors[input.name]?.message && (
                      <Text style={styles.error}>
                        {form.formState.errors[input.name]?.message}
                      </Text>
                    )}
                  </View>
                ))}
                <Pressable
                  accessibilityLabel="Ajustes avanzados"
                  style={styles.command}
                  onPress={() => setAdvanced(!advanced)}
                >
                  <Ionicons
                    name={
                      advanced ? "chevron-up-outline" : "chevron-down-outline"
                    }
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.commandText}>Ajustes avanzados</Text>
                </Pressable>
                {advanced && (
                  <Controller
                    control={form.control}
                    name="protocol"
                    render={({ field }) => (
                      <View
                        style={styles.protocols}
                        accessibilityRole="radiogroup"
                      >
                        {PROTOCOL_OPTIONS.map((option) => (
                          <Pressable
                            key={option.value}
                            accessibilityRole="radio"
                            accessibilityLabel={`Protocolo ${option.label}`}
                            accessibilityState={{
                              checked: field.value === option.value,
                              disabled,
                            }}
                            disabled={disabled}
                            style={[
                              styles.protocol,
                              field.value === option.value && styles.selected,
                            ]}
                            onPress={() => field.onChange(option.value)}
                          >
                            <Text style={styles.commandText}>
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  />
                )}
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel="Guardar impresora"
                    style={styles.command}
                    disabled={disabled}
                    onPress={() => {
                      void save();
                    }}
                  >
                    <Ionicons
                      name="save-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.commandText}>Guardar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Cancelar edición"
                    style={styles.command}
                    disabled={disabled}
                    onPress={() => {
                      setEditor(null);
                      management.cancelAdministration();
                    }}
                  >
                    <Text style={styles.commandText}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {recoveryPrinter && (
              <View style={styles.section}>
                <Text style={styles.title}>
                  Conexión · {recoveryPrinter.name}
                </Text>
                <TextInput
                  accessibilityLabel="Nueva IP de la impresora"
                  style={styles.input}
                  value={recoveryHost}
                  editable={!disabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(host) => {
                    management.cancelRecovery();
                    setRecoveryHost(host);
                  }}
                />
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel="Probar nueva conexión"
                    style={styles.command}
                    disabled={disabled}
                    onPress={() => {
                      void management.testConnection(
                        recoveryPrinter,
                        recoveryHost,
                      );
                    }}
                  >
                    <Ionicons
                      name="print-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.commandText}>Enviar prueba</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Cancelar recuperación"
                    style={styles.command}
                    disabled={disabled}
                    onPress={() => {
                      management.cancelRecovery();
                      setRecoveryPrinter(null);
                    }}
                  >
                    <Text style={styles.commandText}>Cancelar</Text>
                  </Pressable>
                </View>
                {management.pendingRecovery && (
                  <Pressable
                    accessibilityLabel="Confirmar impresora encontrada"
                    style={styles.command}
                    disabled={disabled}
                    onPress={confirmRecovery}
                  >
                    <Ionicons
                      name="checkmark-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.commandText}>Confirmar impresora</Text>
                  </Pressable>
                )}
              </View>
            )}
            {(editor || recoveryPrinter) && (
              <View style={styles.section}>
                <Pressable
                  accessibilityLabel="Buscar impresoras en la red"
                  style={styles.command}
                  disabled={disabled}
                  onPress={() => {
                    void scan();
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.commandText}>Buscar en la red</Text>
                </Pressable>
                {discovery.isScanning && (
                  <ActivityIndicator accessibilityLabel="Buscando impresoras" />
                )}
                {discovery.progress && (
                  <Text style={styles.detail}>
                    {discovery.progress.checked} / {discovery.progress.total}
                  </Text>
                )}
                {discovery.error && (
                  <Text style={styles.error}>{discovery.error}</Text>
                )}
                {hasScanned &&
                  !discovery.isScanning &&
                  !discovery.error &&
                  discovery.results.length === 0 && (
                    <Text style={styles.detail}>
                      No se encontraron impresoras en la red.
                    </Text>
                  )}
                {discovery.results.map((host) => (
                  <Pressable
                    key={host}
                    accessibilityLabel={`Usar impresora encontrada en ${host}`}
                    style={styles.command}
                    disabled={disabled}
                    onPress={() => selectHost(host)}
                  >
                    <Ionicons
                      name="print-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.commandText}>{host}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        }
      />
      <LabelPreviewModal
        visible={preview}
        label={SAMPLE_LABEL}
        onClose={() => setPreview(false)}
      />
      <Modal
        visible={management.isOwnerVerificationVisible}
        transparent
        animationType="fade"
        onRequestClose={management.cancelOwnerVerification}
      >
        <View style={styles.verificationOverlay}>
          <View style={styles.verificationDialog}>
            <Text style={styles.title}>Autorización del dueño</Text>
            <ReauthStep
              allowPin={false}
              onVerified={management.completeOwnerVerification}
              onCancel={management.cancelOwnerVerification}
            />
          </View>
        </View>
      </Modal>
      <PinPromptModal
        visible={management.identityGate.isPinPromptVisible}
        error={management.identityGate.pinError}
        onSubmit={management.identityGate.submitPin}
        onCancel={management.identityGate.cancelPinPrompt}
      />
      <OfflineActorPickerModal
        visible={management.identityGate.isOfflineActorPickerVisible}
        operarios={management.identityGate.offlineOperarios}
        isLoading={management.identityGate.isLoadingOfflineOperarios}
        onSelect={management.identityGate.submitOfflineActor}
        onCancel={management.identityGate.cancelOfflineActorPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  verificationOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  verificationDialog: {
    padding: 20,
    gap: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  offscreen: { position: "absolute", top: -9999, left: -9999 },
  list: { padding: 16, gap: 12 },
  section: { paddingVertical: 12, gap: 10 },
  printer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  detail: { fontSize: 13, color: colors.textMuted },
  empty: {
    fontSize: 15,
    color: colors.textMuted,
    paddingVertical: 24,
    textAlign: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  command: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 44,
  },
  commandText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    flexShrink: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { gap: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  error: { fontSize: 13, color: colors.danger },
  protocols: { flexDirection: "row", gap: 4 },
  protocol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
