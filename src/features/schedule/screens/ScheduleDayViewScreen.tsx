import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { formatPrice } from "../../pricing/domain/strings";
import { computeSaldo } from "../domain/saldo";
import { getDefaultScheduleRepository } from "../../../data/local/scheduleDependencies";
import type { ScheduleStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { normalizeText } from "../../../shared/utils/textSearch";
import { OfflineActorPickerModal } from "../../auth/components/OfflineActorPickerModal";
import { PinPromptModal } from "../../auth/components/PinPromptModal";
import { useIdentityGate } from "../../auth/hooks/useIdentityGate";
import { ScheduleDateTimePickerField } from "../components/ScheduleDateTimePickerField";
import { ScheduleQuickActionSheet } from "../components/ScheduleQuickActionSheet";
import { WeekStrip } from "../components/WeekStrip";
import {
  formatDateForDisplay,
  getWeekDates,
  shiftDateString,
  todayDateString,
} from "../domain/dateUtils";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_CATEGORY_LABELS,
  type Schedule,
  type ScheduleCategory,
  type ScheduleStatus,
} from "../domain/types";
import { colors } from "../../../shared/theme/colors";
import { useScheduleDayView } from "../hooks/useScheduleDayView";
import { useScheduleStatusActions } from "../hooks/useScheduleStatusActions";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleDayView">;

type ActiveView = "dia" | "pendientes";

const VIEWS: { key: ActiveView; icon: string; label: string }[] = [
  { key: "dia", icon: "📅", label: "Día" },
  { key: "pendientes", icon: "📋", label: "Pendientes" },
];

// Mismos emojis que usa Precios para arreglo/confección, para que el
// concepto se sienta igual en toda la app.
const CATEGORY_ICONS: Record<ScheduleCategory, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

// Progresión visual del flujo: neutral -> azul (agendado) -> ámbar (en
// proceso) -> verde claro (listo) -> verde sólido (entregado, el final).
const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string }> = {
  pendiente: { bg: "#f1f5f9", text: colors.textMuted },
  agendado: { bg: colors.primarySoft, text: colors.primary },
  en_proceso: { bg: colors.warningSoft, text: colors.warning },
  listo_para_entregar: { bg: colors.successSoft, text: colors.success },
  entregado: { bg: colors.success, text: "#ffffff" },
};

export default function ScheduleDayViewScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const [activeView, setActiveView] = useState<ActiveView>("dia");
  const [activeCategory, setActiveCategory] =
    useState<ScheduleCategory>("arreglo");
  const {
    dateSchedules: allDateSchedules,
    pendingSchedules: allPendingSchedules,
    isLoading,
    error,
    reload,
  } = useScheduleDayView(selectedDate);
  const clientRepository = useClientRepository();
  const scheduleRepository = useMemo(() => getDefaultScheduleRepository(), []);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetSchedule, setSheetSchedule] = useState<Schedule | null>(null);
  // Espeja `sheetSchedule` para leerse desde dentro de los handlers async de
  // abajo: si el usuario cierra el panel (o abre otro turno) mientras una
  // acción sigue esperando el PIN o la respuesta de la mutación, el cierre
  // de esa closure ya quedó "vieja" — sin esto, la respuesta tardía podría
  // reabrir el panel (o pisar el de otro turno) igual.
  const sheetScheduleIdRef = useRef<string | null>(null);
  useEffect(() => {
    sheetScheduleIdRef.current = sheetSchedule?.id ?? null;
  }, [sheetSchedule]);

  const identityGate = useIdentityGate();
  // Cada acción de estado pide su propio PIN (ver useScheduleStatusActions):
  // en la Agenda se procesan turnos de gente distinta uno tras otro en el
  // mismo dispositivo compartido, así que no conviene dejar la identidad
  // resuelta entre una tarjeta y la siguiente.
  const statusActions = useScheduleStatusActions(
    sheetSchedule?.id ?? "",
    identityGate,
  );

  const matchesSearch = useCallback(
    (schedule: Schedule) => {
      const normalizedQuery = normalizeText(searchTerm);
      if (!normalizedQuery) return true;
      const client = schedule.clientId
        ? clientsById[schedule.clientId]
        : undefined;
      const label = client
        ? `${client.firstName} ${client.lastName}`
        : (schedule.unregisteredClientName ?? "");
      return normalizeText(label).includes(normalizedQuery);
    },
    [searchTerm, clientsById],
  );

  const dateSchedules = useMemo(
    () =>
      allDateSchedules
        .filter((item) => item.category === activeCategory)
        .filter(matchesSearch),
    [allDateSchedules, activeCategory, matchesSearch],
  );
  const pendingSchedules = useMemo(
    () =>
      allPendingSchedules
        .filter((item) => item.category === activeCategory)
        .filter(matchesSearch),
    [allPendingSchedules, activeCategory, matchesSearch],
  );

  // Mientras se busca en la vista "Día", en vez de solo filtrar el día
  // seleccionado se muestran TODAS las coincidencias no entregadas, sin
  // importar la fecha — antes solo mostraba las del día actual (o saltaba
  // a una sola fecha "más cercana"), y era fácil no ver un turno agendado
  // para otro día. Ordenados por fecha; los "sin fecha" al final.
  const isSearchingDia = activeView === "dia" && searchTerm.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearchingDia) return [];
    return allSchedules
      .filter((item) => item.category === activeCategory)
      .filter((item) => item.status !== "entregado")
      .filter(matchesSearch)
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return (
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? "")
        );
      });
  }, [isSearchingDia, allSchedules, activeCategory, matchesSearch]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      // Necesario para poder buscar coincidencias en fechas distintas a la
      // seleccionada (ver `searchResults`) — la agenda normalmente solo
      // carga el día seleccionado y los "sin fecha" por separado.
      void scheduleRepository.getAll().then(setAllSchedules);
    }, [reload, scheduleRepository]),
  );

  useEffect(() => {
    let cancelled = false;
    clientRepository.findAll().then((clients) => {
      if (cancelled) return;
      const map: Record<string, Client> = {};
      for (const client of clients) {
        map[client.id] = client;
      }
      setClientsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [clientRepository, allDateSchedules, allPendingSchedules]);

  const clientLabel = useMemo(
    () => (schedule: Schedule) => {
      if (schedule.clientId) {
        const client = clientsById[schedule.clientId];
        return client
          ? `${client.firstName} ${client.lastName}`
          : "Cliente eliminado";
      }
      return schedule.unregisteredClientName ?? "Cliente";
    },
    [clientsById],
  );

  const closeSheet = useCallback(() => {
    setSheetSchedule(null);
  }, []);

  // Tras cada acción exitosa el panel sigue abierto (con el turno
  // actualizado en pantalla) en vez de cerrarse solo — así se pueden
  // encadenar acciones (ej. asignar operario y de una vez marcar listo)
  // sin volver a tocar la tarjeta. "Cerrar" sigue disponible para salir
  // cuando se quiera.
  const handleSheetMarkReady = async (): Promise<void> => {
    const actingOnId = sheetScheduleIdRef.current;
    const updated = await statusActions.markReady();
    if (updated) {
      if (sheetScheduleIdRef.current === actingOnId) {
        setSheetSchedule(updated);
      }
      void reload();
    }
  };

  const handleSheetMarkDelivered = async (): Promise<void> => {
    const actingOnId = sheetScheduleIdRef.current;
    const updated = await statusActions.markDelivered();
    if (updated) {
      if (sheetScheduleIdRef.current === actingOnId) {
        setSheetSchedule(updated);
      }
      void reload();
    }
  };

  const handleSheetAssignOperario = async (
    operarioId: string | undefined,
  ): Promise<void> => {
    const actingOnId = sheetScheduleIdRef.current;
    const updated = await statusActions.assignOperario(operarioId);
    if (updated) {
      if (sheetScheduleIdRef.current === actingOnId) {
        setSheetSchedule(updated);
      }
      void reload();
    }
  };

  const handleViewDetail = (): void => {
    if (!sheetSchedule) return;
    const scheduleId = sheetSchedule.id;
    closeSheet();
    navigation.navigate("ScheduleForm", { scheduleId });
  };

  const formatSearchResultLabel = (item: Schedule): string => {
    if (!item.date) return "Sin fecha";
    const [, month, day] = item.date.split("-");
    return item.time ? `${day}/${month} · ${item.time}` : `${day}/${month}`;
  };

  const renderCard = (item: Schedule, dateLabel: string) => {
    const statusColor = STATUS_COLORS[item.status];
    return (
      <Pressable
        key={item.id}
        accessibilityLabel={`Ver turno de ${clientLabel(item)} (${dateLabel}, ${item.id})`}
        style={styles.card}
        onPress={() => setSheetSchedule(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardClient} numberOfLines={1}>
            {clientLabel(item)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
          >
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <View style={styles.cardSubRow}>
          <Text style={styles.cardDate}>{dateLabel}</Text>
          {item.price != null ? (
            <Text style={styles.cardPrice}>
              {item.abono
                ? `Saldo ${formatPrice(computeSaldo(item) ?? item.price)}`
                : formatPrice(item.price)}
            </Text>
          ) : null}
          {item.isPriority ? (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>⭐ Prioritario</Text>
            </View>
          ) : null}
        </View>
        {item.price != null && item.abono ? (
          <Text style={styles.cardAbonoDetail}>
            Precio {formatPrice(item.price)} · Abono {formatPrice(item.abono)}
          </Text>
        ) : null}
        {item.notes ? (
          <Text style={styles.cardNotes}>{item.notes}</Text>
        ) : null}
      </Pressable>
    );
  };

  if (
    isLoading &&
    dateSchedules.length === 0 &&
    pendingSchedules.length === 0
  ) {
    return <LoadingView message="Cargando agenda..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void reload()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmented}>
          {SCHEDULE_CATEGORIES.map((category) => {
            const isActive = category === activeCategory;
            return (
              <Pressable
                key={category}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => setActiveCategory(category)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {CATEGORY_ICONS[category]}{" "}
                  {SCHEDULE_CATEGORY_LABELS[category]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons
          name="search"
          size={16}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityLabel="Buscar cliente en la agenda"
          style={styles.searchInput}
          placeholder="Buscar por cliente"
          placeholderTextColor={colors.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 ? (
          <Pressable
            accessibilityLabel="Limpiar búsqueda"
            onPress={() => setSearchTerm("")}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmentedWrapper}>
        <View style={styles.segmented}>
          {VIEWS.map((view) => {
            const isActive = view.key === activeView;
            return (
              <Pressable
                key={view.key}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => setActiveView(view.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {view.icon} {view.label}
                </Text>
                {(() => {
                  const count =
                    view.key === "pendientes"
                      ? pendingSchedules.length
                      : isSearchingDia
                        ? searchResults.length
                        : dateSchedules.length;
                  if (count === 0) return null;
                  return (
                    <View
                      style={[
                        styles.badge,
                        isActive ? styles.badgeActive : styles.badgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isActive && styles.badgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  );
                })()}
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeView === "dia" ? (
        <>
          <WeekStrip
            weekDates={weekDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevWeek={() =>
              setSelectedDate((current) => shiftDateString(current, -7))
            }
            onNextWeek={() =>
              setSelectedDate((current) => shiftDateString(current, 7))
            }
          />

          <View style={styles.header}>
            <Text style={styles.dateLabel} numberOfLines={1}>
              {formatDateForDisplay(selectedDate)}
            </Text>
            <ScheduleDateTimePickerField
              mode="date"
              variant="iconTrigger"
              value={selectedDate}
              onChange={(value) => {
                if (value) setSelectedDate(value);
              }}
              placeholder="Elegir fecha"
              accessibilityLabel="Elegir fecha"
            />
          </View>

          {selectedDate !== todayDateString() ? (
            <Pressable
              accessibilityLabel="Ir a hoy"
              style={styles.todayButton}
              onPress={() => setSelectedDate(todayDateString())}
            >
              <Text style={styles.todayButtonText}>Ir a hoy</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <ScrollView contentContainerStyle={styles.listContent}>
        {activeView === "dia" ? (
          <View style={styles.section}>
            {isSearchingDia ? (
              searchResults.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay turnos que coincidan con la búsqueda.
                </Text>
              ) : (
                searchResults.map((item) =>
                  renderCard(item, formatSearchResultLabel(item)),
                )
              )
            ) : dateSchedules.length === 0 ? (
              <Text style={styles.emptyText}>No hay turnos para este día.</Text>
            ) : (
              dateSchedules.map((item) =>
                renderCard(item, item.time ?? "Sin hora"),
              )
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {pendingSchedules.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchTerm
                  ? "No hay turnos que coincidan con la búsqueda."
                  : "No hay turnos pendientes sin fecha."}
              </Text>
            ) : (
              pendingSchedules.map((item) => renderCard(item, "Sin fecha"))
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel="Nuevo turno"
        style={styles.fabButton}
        onPress={() =>
          navigation.navigate("ScheduleForm", { category: activeCategory })
        }
      >
        <Text style={styles.fabButtonText}>Nuevo turno</Text>
      </Pressable>

      <ScheduleQuickActionSheet
        visible={sheetSchedule !== null}
        schedule={sheetSchedule}
        clientLabel={sheetSchedule ? clientLabel(sheetSchedule) : ""}
        isProcessing={statusActions.isProcessing}
        error={statusActions.error}
        onMarkReady={() => void handleSheetMarkReady()}
        onMarkDelivered={() => void handleSheetMarkDelivered()}
        onAssignOperario={(operarioId) =>
          void handleSheetAssignOperario(operarioId)
        }
        onViewDetail={handleViewDetail}
        onClose={closeSheet}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segmentedWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: colors.primarySoft,
  },
  badgeInactive: {
    backgroundColor: colors.borderStrong,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.primary,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchIcon: {
    marginRight: -2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dateLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  todayButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  todayButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 20,
    flexGrow: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardClient: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardNotes: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardAbonoDetail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.dangerSoft,
  },
  priorityBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  fabButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fabButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
