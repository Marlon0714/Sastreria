import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getDefaultScheduleEventRepository } from "../../../data/local/scheduleEventDependencies";
import type { ScheduleEvent, ScheduleEventAction } from "../domain/events";
import {
  SCHEDULE_CATEGORY_LABELS,
  type ScheduleCategory,
  type ScheduleStatus,
} from "../domain/types";

interface ScheduleHistoryListProps {
  scheduleId: string;
  /** Se incrementa desde afuera para forzar un re-fetch tras una acción de estado. */
  refreshToken: number;
}

const ACTION_LABELS: Record<ScheduleEventAction, string> = {
  created: "Turno creado",
  updated: "Datos actualizados",
  status_auto: "Estado actualizado automáticamente",
  status_manual: "Estado actualizado",
  status_manual_correction: "Corrección manual de estado",
  deleted: "Turno eliminado",
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

// Cliente/operario son UUIDs sin significado para una persona — se avisa
// que cambiaron sin mostrar el valor crudo.
const OPAQUE_ID_FIELDS = new Set(["clientId", "operarioId"]);

const FIELD_LABELS: Record<string, string> = {
  clientId: "Cliente",
  unregisteredClientName: "Cliente (sin registrar)",
  date: "Fecha",
  time: "Hora",
  price: "Precio",
  operarioId: "Operario",
  notes: "Notas",
  status: "Estado",
  isPriority: "Prioridad",
  category: "Categoría",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (field === "status") {
    return STATUS_LABELS[value as ScheduleStatus] ?? String(value);
  }
  if (field === "category") {
    return (
      SCHEDULE_CATEGORY_LABELS[value as ScheduleCategory] ?? String(value)
    );
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }
  return String(value);
}

function formatChanges(changes?: string): string[] {
  if (!changes) {
    return [];
  }

  try {
    const parsed = JSON.parse(changes) as Record<
      string,
      { before: unknown; after: unknown }
    >;

    return Object.entries(parsed).map(([field, { before, after }]) => {
      const label = FIELD_LABELS[field] ?? field;
      if (OPAQUE_ID_FIELDS.has(field)) {
        return `${label} actualizado`;
      }
      return `${label}: ${formatValue(field, before)} → ${formatValue(field, after)}`;
    });
  } catch {
    return [];
  }
}

export function ScheduleHistoryList({
  scheduleId,
  refreshToken,
}: ScheduleHistoryListProps) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getDefaultScheduleEventRepository()
      .getByScheduleId(scheduleId)
      .then((result) => {
        if (!cancelled) {
          setEvents(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleId, refreshToken]);

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Cargando historial" />;
  }

  if (events.length === 0) {
    return <Text style={styles.emptyText}>Todavía no hay historial.</Text>;
  }

  return (
    <View style={styles.container}>
      {events.map((event) => {
        const changeLines = formatChanges(event.changes);
        return (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventAction}>
                {ACTION_LABELS[event.action]}
              </Text>
              {!event.identityVerified ? (
                <Text style={styles.unverifiedBadge}>sin verificar</Text>
              ) : null}
            </View>
            <Text style={styles.eventMeta}>
              {event.actorDisplayName} ·{" "}
              {new Date(event.createdAt).toLocaleString("es-CO")}
            </Text>
            {changeLines.map((line) => (
              <Text key={line} style={styles.eventChange}>
                {line}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontStyle: "italic",
  },
  eventCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventAction: {
    fontWeight: "700",
    color: "#0f172a",
    fontSize: 13,
  },
  unverifiedBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  eventMeta: {
    fontSize: 13,
    color: "#64748b",
  },
  eventChange: {
    fontSize: 13,
    color: "#334155",
  },
});
