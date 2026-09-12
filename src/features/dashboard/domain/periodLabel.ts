import type { DateRange } from "../../schedule/domain/dateUtils";
import {
  formatDateForDisplay,
  formatMonthForDisplay,
  formatShortDate,
} from "../../schedule/domain/dateUtils";
import type { PeriodMode } from "./periodRange";

/**
 * Texto del periodo actualmente seleccionado en el dashboard, según `mode` —
 * ver Decisión 9 del plan de N-104. "dia" reusa `formatDateForDisplay`
 * (mismo formato ya usado hoy, sin cambios visuales para ese caso).
 */
export function formatPeriodLabel(mode: PeriodMode, range: DateRange): string {
  switch (mode) {
    case "dia":
      return formatDateForDisplay(range.startDate);
    case "semana":
      return `Semana del ${formatShortDate(range.startDate)} al ${formatShortDate(range.endDate)}`;
    case "mes":
      return formatMonthForDisplay(range.startDate);
    case "rango":
      return `${formatShortDate(range.startDate)} - ${formatShortDate(range.endDate)}`;
  }
}
