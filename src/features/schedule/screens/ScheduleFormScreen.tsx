import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ScheduleStackParamList } from "../../../navigation/types";
import {
  ErrorView,
  LoadingView,
  ScheduleDateTimePickerField,
} from "../../../shared/components";
import { OfflineActorPickerModal } from "../../auth/components/OfflineActorPickerModal";
import { PinPromptModal } from "../../auth/components/PinPromptModal";
import { useIdentityGate } from "../../auth/hooks/useIdentityGate";
import { useOwnerOnlyVisibility } from "../../auth/hooks/useOwnerOnlyVisibility";
import {
  ClientPickerField,
  type ClientPickerFieldHandle,
} from "../components/ClientPickerField";
import { OperarioPickerField } from "../components/OperarioPickerField";
import { ScheduleHistoryList } from "../components/ScheduleHistoryList";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import { formatDateForDisplay } from "../domain/dateUtils";
import {
  findDuplicateScheduleByName,
  type NamedSchedule,
} from "../domain/duplicateCheck";
import {
  createScheduleSchema,
  type CreateScheduleSchemaInput,
  type CreateScheduleSchemaOutput,
} from "../domain/schemas";
import {
  countPendingSchedulesOnDate,
  formatPendingScheduleCountLabel,
} from "../domain/scheduleWorkloadCount";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_CATEGORY_LABELS,
  type Schedule,
  type ScheduleCategory,
  type ScheduleStatus,
} from "../domain/types";
import { colors } from "../../../shared/theme/colors";
import { computeSaldo } from "../domain/saldo";
import {
  describeManualCorrectionSideEffects,
  getManualCorrectionBlockReason,
} from "../domain/statusDerivation";
import { evaluateDeliveryGuard } from "../domain/deliveryGuard";
import { formatPrice } from "../../pricing/domain/strings";
import { useDeleteSchedule } from "../hooks/useDeleteSchedule";
import { useScheduleForm } from "../hooks/useScheduleForm";
import { useScheduleStatusActions } from "../hooks/useScheduleStatusActions";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleForm">;

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

// Mismos emojis que usa Precios para arreglo/confección.
const CATEGORY_ICONS: Record<ScheduleCategory, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};

const CORRECTION_STATUS_OPTIONS: ScheduleStatus[] = [
  "pendiente",
  "agendado",
  "en_proceso",
  "listo_para_entregar",
  "entregado",
];

export default function ScheduleFormScreen({ navigation, route }: Props) {
  const { scheduleId, category: categoryParam } = route.params;
  const identityGate = useIdentityGate();
  const canSeeOwnerFlag = useOwnerOnlyVisibility();
  // Solo se usa para chequear duplicados por fecha antes de guardar (ver
  // handleDuplicateCheckedSubmit más abajo) — el guardado real sigue
  // pasando por useScheduleForm.submit().
  const scheduleRepo = useMemo(() => getDefaultScheduleRepository(), []);
  const {
    schedule,
    isLoading,
    isSubmitting,
    error,
    submit,
    syncScheduleSnapshot,
  } = useScheduleForm(scheduleId, identityGate);
  const {
    deleteSchedule,
    isDeleting,
    error: deleteError,
  } = useDeleteSchedule(identityGate);
  const statusActions = useScheduleStatusActions(scheduleId ?? "", identityGate);
  // Guardar, marcar listo/entregado, corregir y eliminar mutan el mismo
  // turno con lecturas-y-reescrituras independientes (sin control de
  // concurrencia a nivel de fila) — si dos de estas quedaran habilitadas al
  // mismo tiempo, un doble tap entre botones distintos podría hacer que una
  // sobrescriba silenciosamente lo que la otra acababa de guardar. Un solo
  // flag "ocupado" que deshabilita TODAS las acciones mientras cualquiera
  // esté en curso evita esa ventana.
  const [displaySchedule, setDisplaySchedule] = useState<Schedule | null>(
    null,
  );
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  // Estado puramente local — NO es un campo del schema/DTO/tabla: solo fija
  // `abono = price` vía setValue. Evita una segunda fuente de verdad que
  // podría desincronizarse de `abono` tras una edición futura del precio
  // (ver Decisiones de Diseño, N-107).
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [isResolvingClient, setIsResolvingClient] = useState(false);
  // Conteo informativo (no bloqueante) de turnos ya agendados para la fecha
  // elegida, mostrado apenas se cambia/selecciona la fecha — independiente
  // de la llamada a getByDate que ya existe en onSubmit para el chequeo de
  // duplicados (ver Decisiones de Diseño del plan: comparten método pero no
  // estado, para que el chequeo de duplicados siga leyendo el dato más
  // fresco posible al momento de guardar).
  const [pendingCountOnDate, setPendingCountOnDate] = useState<number | null>(
    null,
  );
  const clientPickerRef = useRef<ClientPickerFieldHandle>(null);
  const isBusy =
    isSubmitting || statusActions.isProcessing || isDeleting || isResolvingClient;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateScheduleSchemaInput, unknown, CreateScheduleSchemaOutput>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      date: undefined,
      time: undefined,
      clientId: undefined,
      unregisteredClientName: "",
      price: undefined,
      abono: undefined,
      operarioId: undefined,
      notes: "",
      isPriority: false,
      isOwnerFlagged: false,
      category: categoryParam ?? "arreglo",
    },
  });

  const dateValue = useWatch({ control, name: "date" });
  const categoryValue = useWatch({ control, name: "category" });
  const priceValue = useWatch({ control, name: "price" });
  const abonoValue = useWatch({ control, name: "abono" });
  const saldo = computeSaldo({ price: priceValue, abono: abonoValue });

  useEffect(() => {
    setDisplaySchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    if (!schedule) return;
    setHasTime(!!schedule.time);
    // Un turno ya guardado con abono === price abre el formulario con el
    // switch activado, para que refleje lo que ya hay en los datos en vez
    // de arrancar siempre en false (mismo patrón que hasTime, ver plan).
    setIsFullyPaid(schedule.price != null && schedule.abono === schedule.price);
    reset({
      date: schedule.date,
      time: schedule.time,
      clientId: schedule.clientId,
      unregisteredClientName: schedule.unregisteredClientName ?? "",
      price: schedule.price,
      abono: schedule.abono,
      operarioId: schedule.operarioId,
      notes: schedule.notes ?? "",
      isPriority: schedule.isPriority,
      isOwnerFlagged: schedule.isOwnerFlagged,
      category: schedule.category,
    });
  }, [schedule, reset]);

  // "Prioritario" solo tiene sentido para turnos ya agendados (con fecha) —
  // si se le quita la fecha, deja de aplicar.
  useEffect(() => {
    if (!dateValue) {
      setValue("isPriority", false);
    }
  }, [dateValue, setValue]);

  // El abono solo tiene sentido si hay un precio del que descontarlo — si se
  // borra el precio, el campo (y su valor) deja de mostrarse. Un turno sin
  // precio tampoco puede seguir "pagado en su totalidad".
  //
  // El `skip` en el primer disparo evita una condición de carrera al montar
  // con un turno ya guardado: `useWatch("price")` todavía refleja el
  // defaultValue (undefined) en el primer efecto del montaje, ANTES de que
  // el `reset()` del efecto de arriba termine de propagarse — sin este
  // guard, esta limpieza se ejecutaba una vez de más con `priceValue`
  // todavía "viejo" y pisaba el `isFullyPaid` recién calculado desde
  // `schedule` con `false`, aunque el turno ya viniera saldado. En modo
  // creación (sin turno) es un no-op: ambos campos ya arrancan vacíos.
  //
  // Este guard depende de que el efecto de `reset()` (arriba) se declare
  // ANTES que este en el código fuente, para correr primero en el mismo
  // commit de montaje — si se reordenan o se separan en efectos distintos,
  // revisar que esta suposición siga siendo cierta.
  const skipInitialPriceClearRef = useRef(true);
  useEffect(() => {
    if (skipInitialPriceClearRef.current) {
      skipInitialPriceClearRef.current = false;
      return;
    }
    if (priceValue == null) {
      setValue("abono", undefined);
      setIsFullyPaid(false);
    }
  }, [priceValue, setValue]);

  // Mientras el switch "Pagado en su totalidad" está activo, cada cambio de
  // precio vuelve a igualar el abono al precio en vez de desmarcarse solo:
  // el caso de uso típico es "cambié el precio final pero el cliente ya
  // había pagado todo" (ver Decisiones de Diseño, N-107).
  useEffect(() => {
    if (isFullyPaid && priceValue != null) {
      setValue("abono", priceValue);
    }
  }, [priceValue, isFullyPaid, setValue]);

  // Carga reactiva (no bloqueante) del conteo de turnos ya agendados para la
  // fecha elegida, cada vez que cambia la fecha o la categoría (el conteo es
  // por categoría — un "arreglo" no debe contar "confecciones" del mismo día
  // ni viceversa). Mismo patrón `cancelled` que useScheduleForm.ts para no
  // setear estado tras un cambio posterior o un desmontaje de la pantalla.
  useEffect(() => {
    if (!dateValue) {
      setPendingCountOnDate(null);
      return;
    }

    let cancelled = false;
    setPendingCountOnDate(null);

    scheduleRepo
      .getByDate(dateValue)
      .then((result) => {
        if (!cancelled) {
          setPendingCountOnDate(
            countPendingSchedulesOnDate(
              result,
              scheduleId,
              categoryValue ?? "arreglo",
            ),
          );
        }
      })
      .catch((err: unknown) => {
        console.error(
          JSON.stringify({
            level: "error",
            service: "ScheduleFormScreen",
            message: "No se pudo cargar el conteo de turnos agendados",
            date: dateValue,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        if (!cancelled) {
          setPendingCountOnDate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateValue, categoryValue, scheduleId, scheduleRepo]);

  const handleMarkReady = async (): Promise<void> => {
    const updated = await statusActions.markReady();
    if (updated) {
      setDisplaySchedule(updated);
      // Mantiene sincronizado el snapshot que usa useScheduleForm como
      // "antes" — si no, un "Guardar" posterior en la misma visita
      // compararía contra el estado previo a esta acción y registraría
      // una transición de estado que ya había ocurrido (y ya quedó
      // auditada) por esta vía.
      syncScheduleSnapshot(updated);
      setHistoryRefreshToken((token) => token + 1);
    }
  };

  const performMarkDelivered = async (): Promise<void> => {
    const updated = await statusActions.markDelivered();
    if (updated) {
      setDisplaySchedule(updated);
      syncScheduleSnapshot(updated);
      setHistoryRefreshToken((token) => token + 1);
    }
  };

  const handleMarkDelivered = (): void => {
    const { missingPrice, saldoPendiente } = displaySchedule
      ? evaluateDeliveryGuard(displaySchedule)
      : { missingPrice: false, saldoPendiente: undefined };

    // Paso (b): saldo pendiente. Se evalúa tanto de entrada como después de
    // elegir "Entregar sin precio" en el paso (a) (ver Decisiones de Diseño,
    // N-107).
    const confirmDelivery = (): void => {
      if (saldoPendiente != null && saldoPendiente > 0) {
        Alert.alert(
          "Saldo pendiente",
          `Este turno tiene un saldo pendiente de ${formatPrice(
            saldoPendiente,
          )}. Si continúas, se registrará como pagado en su totalidad. ¿Marcar como entregado de todas formas?`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Confirmar", onPress: () => void performMarkDelivered() },
          ],
        );
        return;
      }
      void performMarkDelivered();
    };

    // Paso (a): precio no registrado (incluye price === 0). A diferencia del
    // panel rápido, el campo "Precio" ya está en esta misma pantalla (card
    // "Detalles") — cancelar y escribirlo ahí ya cumple "ponerlo ahí mismo",
    // sin necesitar un tercer botón de navegación (ver Decisiones de Diseño).
    if (missingPrice) {
      Alert.alert(
        "Precio no registrado",
        "Puedes ingresarlo arriba antes de continuar, o entregar sin precio.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Entregar sin precio", onPress: confirmDelivery },
        ],
      );
      return;
    }

    confirmDelivery();
  };

  const handleApplyCorrection = (newStatus: ScheduleStatus): void => {
    const sideEffects = displaySchedule
      ? describeManualCorrectionSideEffects(displaySchedule, newStatus)
      : [];
    const sideEffectsMessage =
      sideEffects.length > 0
        ? ` También se quitará ${sideEffects.join(" y ")}.`
        : "";

    Alert.alert(
      "Confirmar corrección manual",
      `¿Cambiar el estado a "${STATUS_LABELS[newStatus]}"? Esta acción queda registrada como corrección manual, no como transición automática.${sideEffectsMessage}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const updated = await statusActions.applyCorrection(newStatus);
            if (updated) {
              setDisplaySchedule(updated);
              syncScheduleSnapshot(updated);
              setHistoryRefreshToken((token) => token + 1);
            }
            setIsCorrectionOpen(false);
          },
        },
      ],
    );
  };

  // Nombre a comparar de un turno (propio o ya guardado): si tiene
  // clientId, el nombre completo del cliente registrado (resuelto desde la
  // lista que ClientPickerField ya cargó en memoria, sin consultar de
  // nuevo el repositorio de clientes); si no, el nombre sin registrar.
  const resolveScheduleName = (item: NamedSchedule): string | undefined =>
    item.clientId
      ? clientPickerRef.current?.resolveClientFullName(item.clientId)
      : item.unregisteredClientName;

  const onSubmit = handleSubmit(async (values) => {
    const proceedSubmit = async (): Promise<void> => {
      const result = await submit(values);
      if (result) {
        navigation.goBack();
      }
    };

    // La advertencia de "turno duplicado" solo aplica a turnos con fecha
    // asignada — un turno "Pendiente" (sin fecha) no tiene día contra el
    // cual comparar.
    if (values.date) {
      const candidateName = resolveScheduleName(values);
      if (candidateName) {
        const schedulesOnDate = await scheduleRepo.getByDate(values.date);
        const duplicate = findDuplicateScheduleByName(
          schedulesOnDate,
          candidateName,
          scheduleId,
          resolveScheduleName,
        );

        if (duplicate) {
          Alert.alert(
            "Turno duplicado",
            `Ya hay un turno de ${candidateName} agendado para el ${formatDateForDisplay(
              values.date,
            )}. ¿Deseas guardarlo de todas formas?`,
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Guardar de todas formas",
                onPress: () => void proceedSubmit(),
              },
            ],
          );
          return;
        }
      }
    }

    await proceedSubmit();
  });

  const handleSavePress = async (): Promise<void> => {
    // Si se abrió "Registrar cliente" pero nunca se presionó el botón,
    // resuelve esos datos (registra el cliente o los deja como "sin
    // registrar") ANTES de validar/guardar, para no perderlos.
    setIsResolvingClient(true);
    try {
      await clientPickerRef.current?.resolvePendingRegistration();
    } finally {
      setIsResolvingClient(false);
    }
    await onSubmit();
  };

  const onDelete = () => {
    if (!scheduleId) return;
    Alert.alert(
      "Eliminar turno",
      "¿Seguro que deseas eliminar este turno? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteSchedule(scheduleId);
            if (ok) navigation.goBack();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingView message="Cargando turno..." />;
  }

  if (scheduleId && !schedule) {
    return (
      <ErrorView
        message="Este turno ya no existe o no se pudo cargar."
        retryLabel="Volver"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      {displaySchedule ? (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Estado: {STATUS_LABELS[displaySchedule.status]}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Categoría</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoryRow}>
              {SCHEDULE_CATEGORIES.map((category) => {
                const isActive = value === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => onChange(category)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive && styles.categoryChipTextActive,
                      ]}
                    >
                      {CATEGORY_ICONS[category]}{" "}
                      {SCHEDULE_CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cliente</Text>

        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="clientId"
            render={({ field: { onChange: onChangeClientId, value: clientIdValue } }) => (
              <Controller
                control={control}
                name="unregisteredClientName"
                render={({
                  field: {
                    onChange: onChangeUnregisteredName,
                    value: unregisteredNameValue,
                  },
                }) => (
                  <ClientPickerField
                    ref={clientPickerRef}
                    clientId={clientIdValue}
                    unregisteredName={unregisteredNameValue ?? undefined}
                    onChangeClientId={onChangeClientId}
                    onChangeUnregisteredName={(name) =>
                      onChangeUnregisteredName(name ?? "")
                    }
                    errorMessage={errors.clientId?.message}
                  />
                )}
              />
            )}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuándo</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fecha (opcional)</Text>
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <ScheduleDateTimePickerField
                mode="date"
                value={value}
                onChange={onChange}
                placeholder="Sin fecha"
                accessibilityLabel="Fecha"
                errorMessage={errors.date?.message}
              />
            )}
          />
        </View>

        {dateValue && pendingCountOnDate !== null ? (
          <Text style={styles.helperText}>
            {formatPendingScheduleCountLabel(pendingCountOnDate)}
          </Text>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Con hora específica</Text>
          <Switch
            accessibilityLabel="Con hora específica"
            value={hasTime}
            onValueChange={(next) => {
              setHasTime(next);
              if (!next) {
                setValue("time", undefined);
              }
            }}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={hasTime ? colors.primary : "#f4f3f4"}
          />
        </View>

        {hasTime ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Hora</Text>
            <Controller
              control={control}
              name="time"
              render={({ field: { onChange, value } }) => (
                <ScheduleDateTimePickerField
                  mode="time"
                  value={value}
                  onChange={onChange}
                  placeholder="Sin hora"
                  accessibilityLabel="Hora"
                  allowClear={false}
                  errorMessage={errors.time?.message}
                />
              )}
            />
          </View>
        ) : null}

        {dateValue ? (
          <Controller
            control={control}
            name="isPriority"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>⭐ Prioritario</Text>
                <Switch
                  accessibilityLabel="Prioritario"
                  value={!!value}
                  onValueChange={onChange}
                  trackColor={{
                    false: colors.border,
                    true: colors.dangerSoft,
                  }}
                  thumbColor={value ? colors.danger : "#f4f3f4"}
                />
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Precio (opcional)</Text>
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="Ej: 15000"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={(text) => {
                  // Solo dígitos — ver PricingForm.tsx para el motivo: un
                  // "." acá se confunde con el separador de miles que
                  // formatPrice usa al MOSTRAR precios en el resto de la
                  // app, y "15.000" se leería como 15 en vez de 15000.
                  const digitsOnly = text.replace(/[^0-9]/g, "");
                  onChange(
                    digitsOnly === "" ? undefined : parseInt(digitsOnly, 10),
                  );
                }}
                value={value === undefined ? "" : String(value)}
              />
            )}
          />
          {errors.price ? (
            <Text style={styles.errorText}>{errors.price.message}</Text>
          ) : null}
        </View>

        {priceValue != null ? (
          <View style={styles.fieldGroup}>
            {!isFullyPaid ? (
              <>
                <Text style={styles.label}>Abono (opcional)</Text>
                <Controller
                  control={control}
                  name="abono"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.abono && styles.inputError]}
                      placeholder="Ej: 5000"
                      placeholderTextColor={colors.textPlaceholder}
                      keyboardType="numeric"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        const digitsOnly = text.replace(/[^0-9]/g, "");
                        onChange(
                          digitsOnly === ""
                            ? undefined
                            : parseInt(digitsOnly, 10),
                        );
                      }}
                      value={value === undefined ? "" : String(value)}
                    />
                  )}
                />
                {errors.abono ? (
                  <Text style={styles.errorText}>{errors.abono.message}</Text>
                ) : null}
              </>
            ) : null}
            {saldo != null ? (
              <Text style={styles.helperText}>
                Saldo pendiente: {formatPrice(saldo)}
              </Text>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pagado</Text>
              <Switch
                accessibilityLabel="Pagado en su totalidad"
                value={isFullyPaid}
                onValueChange={(next) => {
                  setIsFullyPaid(next);
                  if (next) {
                    setValue("abono", priceValue);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.successSoft }}
                thumbColor={isFullyPaid ? colors.success : "#f4f3f4"}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Operario asignado (opcional)</Text>
          <Controller
            control={control}
            name="operarioId"
            render={({ field: { onChange, value } }) => (
              <OperarioPickerField
                value={value}
                onChange={onChange}
                errorMessage={errors.operarioId?.message}
              />
            )}
          />
        </View>

        {canSeeOwnerFlag ? (
          <Controller
            control={control}
            name="isOwnerFlagged"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>🔖 Marcado</Text>
                <Switch
                  accessibilityLabel="Marcado"
                  value={!!value}
                  onValueChange={onChange}
                  trackColor={{
                    false: colors.border,
                    true: colors.warningSoft,
                  }}
                  thumbColor={value ? colors.warning : "#f4f3f4"}
                />
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notas</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                errors.notes && styles.inputError,
              ]}
              placeholder="Detalles del turno"
              placeholderTextColor={colors.textPlaceholder}
              value={value}
              onChangeText={onChange}
              multiline
              maxLength={500}
            />
          )}
        />
        {errors.notes ? (
          <Text style={styles.errorText}>{errors.notes.message}</Text>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityLabel="Guardar turno"
        style={({ pressed }) => [
          styles.saveButton,
          isBusy ? styles.buttonDisabled : null,
          pressed && !isBusy ? styles.saveButtonPressed : null,
        ]}
        onPress={() => void handleSavePress()}
        disabled={isBusy}
      >
        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        <Text style={styles.saveButtonText}>
          {isSubmitting || isResolvingClient ? "Guardando..." : "Guardar turno"}
        </Text>
      </Pressable>

      {scheduleId && displaySchedule ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado del turno</Text>

          {statusActions.error ? (
            <Text style={styles.errorText}>{statusActions.error}</Text>
          ) : null}

          {!displaySchedule.operarioId && displaySchedule.status !== "entregado" ? (
            <Text style={styles.helperText}>
              Asigna un operario para poder marcar el turno como listo o
              entregado.
            </Text>
          ) : null}

          {displaySchedule.status !== "listo_para_entregar" &&
          displaySchedule.status !== "entregado" &&
          displaySchedule.operarioId ? (
            <Pressable
              accessibilityLabel="Marcar listo para entregar"
              style={[
                styles.statusActionButton,
                isBusy ? styles.buttonDisabled : null,
              ]}
              onPress={() => void handleMarkReady()}
              disabled={isBusy}
            >
              <Ionicons name="bag-check-outline" size={18} color="#ffffff" />
              <Text style={styles.statusActionButtonText}>
                Marcar listo para entregar
              </Text>
            </Pressable>
          ) : null}

          {displaySchedule.status !== "entregado" && displaySchedule.operarioId ? (
            <Pressable
              accessibilityLabel="Marcar entregado"
              style={[
                styles.statusActionButton,
                isBusy ? styles.buttonDisabled : null,
              ]}
              onPress={handleMarkDelivered}
              disabled={isBusy}
            >
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.statusActionButtonText}>
                Marcar entregado
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Corrección manual de estado"
            style={styles.correctionToggle}
            onPress={() => setIsCorrectionOpen((open) => !open)}
          >
            <Text style={styles.correctionToggleText}>
              {isCorrectionOpen ? "Cancelar corrección" : "Corrección manual"}
            </Text>
          </Pressable>

          {isCorrectionOpen ? (
            <View style={styles.correctionRow}>
              {CORRECTION_STATUS_OPTIONS.filter(
                (status) => status !== displaySchedule.status,
              )
                .filter(
                  (status) =>
                    !getManualCorrectionBlockReason(displaySchedule, status),
                )
                .map((status) => (
                  <Pressable
                    key={status}
                    accessibilityLabel={`Corregir a ${STATUS_LABELS[status]}`}
                    style={styles.correctionChip}
                    onPress={() => handleApplyCorrection(status)}
                    disabled={isBusy}
                  >
                    <Text style={styles.correctionChipText}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {scheduleId ? (
        <>
          <Pressable
            accessibilityLabel="Eliminar turno"
            style={[styles.deleteButton, isBusy ? styles.buttonDisabled : null]}
            onPress={onDelete}
            disabled={isBusy}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? "Eliminando..." : "Eliminar turno"}
            </Text>
          </Pressable>
          {deleteError ? (
            <Text style={styles.errorText}>{deleteError}</Text>
          ) : null}
        </>
      ) : null}

      {scheduleId ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionTitle}>Historial</Text>
          <ScheduleHistoryList
            scheduleId={scheduleId}
            refreshToken={historyRefreshToken}
          />
        </View>
      ) : null}

      <PinPromptModal
        visible={identityGate.isPinPromptVisible}
        error={identityGate.pinError}
        onSubmit={(pin) => void identityGate.submitPin(pin)}
        onCancel={identityGate.cancelPinPrompt}
      />
      <OfflineActorPickerModal
        visible={identityGate.isOfflineActorPickerVisible}
        operarios={identityGate.offlineOperarios}
        isLoading={identityGate.isLoadingOfflineOperarios}
        onSelect={identityGate.submitOfflineActor}
        onCancel={identityGate.cancelOfflineActorPicker}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  statusActionButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusActionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  correctionToggle: {
    alignItems: "center",
    paddingVertical: 8,
  },
  correctionToggleText: {
    color: colors.warning,
    fontWeight: "600",
    fontSize: 13,
  },
  correctionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  correctionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  correctionChipText: {
    color: colors.warning,
    fontWeight: "600",
    fontSize: 13,
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
  inputError: {
    borderColor: colors.danger,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  statusBadgeText: {
    color: colors.primaryPressed,
    fontWeight: "700",
    fontSize: 13,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
