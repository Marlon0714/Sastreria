import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ScheduleStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { normalizeText } from "../../../shared/utils/textSearch";
import { OfflineActorPickerModal } from "../../auth/components/OfflineActorPickerModal";
import { PinPromptModal } from "../../auth/components/PinPromptModal";
import { useIdentityGate } from "../../auth/hooks/useIdentityGate";
import { ScheduleDateTimePickerField } from "../components/ScheduleDateTimePickerField";
import { ScheduleQuickActionSheet } from "../components/ScheduleQuickActionSheet";
import {
  formatDateForDisplay,
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
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetSchedule, setSheetSchedule] = useState<Schedule | null>(null);

  const identityGate = useIdentityGate();
  const statusActions = useScheduleStatusActions(
    sheetSchedule?.id ?? "",
    identityGate,
  );

  // Un PIN vale para toda la visita a esta pantalla (igual que en
  // ScheduleFormScreen) — se libera al salir de la Agenda, no cada vez que
  // se cierra el panel rápido, para no repetirlo turno tras turno.
  useEffect(() => {
    return () => {
      identityGate.releaseIdentity();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityGate.releaseIdentity]);

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

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
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

  const handleSheetMarkReady = async (): Promise<void> => {
    const updated = await statusActions.markReady();
    if (updated) {
      closeSheet();
      void reload();
    }
  };

  const handleSheetMarkDelivered = async (): Promise<void> => {
    const updated = await statusActions.markDelivered();
    if (updated) {
      closeSheet();
      void reload();
    }
  };

  const handleViewDetail = (): void => {
    if (!sheetSchedule) return;
    const scheduleId = sheetSchedule.id;
    closeSheet();
    navigation.navigate("ScheduleForm", { scheduleId });
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
            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          ) : null}
          {item.isPriority ? (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>⭐ Prioritario</Text>
            </View>
          ) : null}
        </View>
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
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Día anterior"
              style={styles.navButton}
              onPress={() =>
                setSelectedDate((current) => shiftDateString(current, -1))
              }
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>

            <View style={styles.dateSelector}>
              <ScheduleDateTimePickerField
                mode="date"
                variant="dayNavigator"
                value={selectedDate}
                onChange={(value) => {
                  if (value) setSelectedDate(value);
                }}
                placeholder="Elegir fecha"
                accessibilityLabel="Elegir fecha"
                allowClear={false}
              />
            </View>

            <Pressable
              accessibilityLabel="Día siguiente"
              style={styles.navButton}
              onPress={() =>
                setSelectedDate((current) => shiftDateString(current, 1))
              }
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </Pressable>
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
            <Text style={styles.sectionTitle}>
              {formatDateForDisplay(selectedDate)}
            </Text>
            {dateSchedules.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchTerm
                  ? "No hay turnos que coincidan con la búsqueda."
                  : "No hay turnos para este día."}
              </Text>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  dateSelector: {
    flex: 1,
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
