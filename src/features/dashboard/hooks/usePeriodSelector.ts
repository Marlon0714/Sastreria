import { useCallback, useMemo, useState } from "react";

import {
  type DateRange,
  getMonthRange,
  getWeekDates,
  todayDateString,
} from "../../schedule/domain/dateUtils";
import { formatPeriodLabel } from "../domain/periodLabel";
import {
  type PeriodMode,
  computeRangeForMode,
  isCurrentPeriod,
  shiftAnchorForMode,
  validateCustomRange,
} from "../domain/periodRange";

export interface UsePeriodSelectorResult {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  anchorDate: string;
  /** `null` en "rango" mientras falte elegir fecha o si el rango es inválido. */
  range: DateRange | null;
  /** Mensaje de error del rango personalizado, o `null` si es válido o está incompleto. */
  rangeError: string | null;
  /** Texto del periodo actual — "" si `range` es `null` (nada que formatear todavía). */
  periodLabel: string;
  /** Las 7 fechas lunes..domingo, solo en modo "semana" — `null` en cualquier otro modo. */
  weekDatesForBreakdown: string[] | null;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrentPeriod: () => void;
  canGoToCurrentPeriod: boolean;
  /** Salto directo a una fecha exacta — solo tiene efecto visible en modo "dia". */
  jumpToDate: (date: string) => void;
  customRangeStart: string | undefined;
  customRangeEnd: string | undefined;
  setCustomRangeStart: (date: string | undefined) => void;
  setCustomRangeEnd: (date: string | undefined) => void;
}

/**
 * El mes se representa internamente siempre como el día 1 del mes
 * (`YYYY-MM-01`) — ver Decisión 6 del plan de N-104: evita arrastrar un día
 * arbitrario del mes anterior al desplazarse ±1 mes.
 */
function normalizeAnchorForMode(mode: PeriodMode, anchorDate: string): string {
  return mode === "mes" ? getMonthRange(anchorDate).startDate : anchorDate;
}

/**
 * Estado puro de UI del selector de periodo del dashboard (día/semana/mes/
 * rango personalizado) — no toca repositorios ni datos, solo deriva fechas.
 * Ver Decisión 11 del plan: queda en `dashboard/hooks/` (no en `shared/`)
 * hasta que exista un segundo consumidor real (N-102).
 */
export function usePeriodSelector(): UsePeriodSelectorResult {
  const [mode, setModeState] = useState<PeriodMode>("semana");
  const [anchorDate, setAnchorDate] = useState<string>(todayDateString());
  const [customRangeStart, setCustomRangeStart] = useState<string | undefined>(
    undefined,
  );
  const [customRangeEnd, setCustomRangeEnd] = useState<string | undefined>(
    undefined,
  );

  // Cambiar de modo se queda en el periodo que contiene el `anchorDate`
  // actual, nunca salta a "hoy" — ver Tarea 11 del plan.
  const setMode = useCallback((newMode: PeriodMode): void => {
    setModeState(newMode);
    setAnchorDate((current) => normalizeAnchorForMode(newMode, current));
  }, []);

  const range = useMemo(
    () =>
      computeRangeForMode(mode, anchorDate, {
        startDate: customRangeStart,
        endDate: customRangeEnd,
      }),
    [mode, anchorDate, customRangeStart, customRangeEnd],
  );

  const rangeError = useMemo(
    () =>
      mode === "rango"
        ? validateCustomRange(customRangeStart, customRangeEnd)
        : null,
    [mode, customRangeStart, customRangeEnd],
  );

  const periodLabel = useMemo(
    () => (range ? formatPeriodLabel(mode, range) : ""),
    [mode, range],
  );

  const weekDatesForBreakdown = useMemo(
    () => (mode === "semana" ? getWeekDates(anchorDate) : null),
    [mode, anchorDate],
  );

  const goToPrevious = useCallback((): void => {
    if (mode === "rango") return;
    setAnchorDate((current) => shiftAnchorForMode(mode, current, -1));
  }, [mode]);

  const goToNext = useCallback((): void => {
    if (mode === "rango") return;
    setAnchorDate((current) => shiftAnchorForMode(mode, current, 1));
  }, [mode]);

  const goToCurrentPeriod = useCallback((): void => {
    setAnchorDate(normalizeAnchorForMode(mode, todayDateString()));
  }, [mode]);

  const canGoToCurrentPeriod = useMemo(
    () => mode !== "rango" && !isCurrentPeriod(mode, anchorDate, todayDateString()),
    [mode, anchorDate],
  );

  const jumpToDate = useCallback((date: string): void => {
    setAnchorDate(date);
  }, []);

  return {
    mode,
    setMode,
    anchorDate,
    range,
    rangeError,
    periodLabel,
    weekDatesForBreakdown,
    goToPrevious,
    goToNext,
    goToCurrentPeriod,
    canGoToCurrentPeriod,
    jumpToDate,
    customRangeStart,
    customRangeEnd,
    setCustomRangeStart,
    setCustomRangeEnd,
  };
}
