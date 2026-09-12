import {
  type DateRange,
  daysBetweenDates,
  getMonthRange,
  getWeekDates,
  shiftDateString,
  shiftMonthDateString,
} from "../../features/schedule/domain/dateUtils";

export type PeriodMode = "dia" | "semana" | "mes" | "rango";

/**
 * Límite de producto (no técnico) para el rango personalizado — evita
 * totales sin valor interpretativo real (ej. "todo el historial") — ver
 * Decisión 7 del plan de N-104. No confirmado explícitamente por el
 * usuario, señalado en el reporte de entrega.
 */
export const MAX_CUSTOM_RANGE_DAYS = 366;

export interface CustomRangeInput {
  startDate?: string;
  endDate?: string;
}

/**
 * Mensaje de error si `startDate`/`endDate` son inválidas entre sí, o
 * `null` si son válidas O si falta elegir alguna de las dos (estado
 * "incompleto", distinto de "inválido" — ver Decisión 7 del plan).
 */
export function validateCustomRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate || !endDate) {
    return null;
  }
  if (endDate < startDate) {
    return "La fecha final no puede ser anterior a la fecha inicial.";
  }
  if (daysBetweenDates(startDate, endDate) > MAX_CUSTOM_RANGE_DAYS) {
    return `El rango no puede superar ${MAX_CUSTOM_RANGE_DAYS} días.`;
  }
  return null;
}

/**
 * Rango de fechas efectivo para `mode`, anclado en `anchorDate` (irrelevante
 * en "rango", que usa `customRange` en su lugar). `null` en "rango" mientras
 * falte elegir alguna fecha, o si el rango es inválido — en ambos casos no
 * hay nada utilizable para filtrar (ver `validateCustomRange` para el
 * mensaje de error, que es responsabilidad de quien llama exponer aparte).
 */
export function computeRangeForMode(
  mode: PeriodMode,
  anchorDate: string,
  customRange: CustomRangeInput,
): DateRange | null {
  switch (mode) {
    case "dia":
      return { startDate: anchorDate, endDate: anchorDate };
    case "semana": {
      const weekDates = getWeekDates(anchorDate);
      return {
        startDate: weekDates[0] ?? anchorDate,
        endDate: weekDates[weekDates.length - 1] ?? anchorDate,
      };
    }
    case "mes":
      return getMonthRange(anchorDate);
    case "rango": {
      const { startDate, endDate } = customRange;
      if (!startDate || !endDate) return null;
      if (validateCustomRange(startDate, endDate) != null) return null;
      return { startDate, endDate };
    }
  }
}

/**
 * Desplaza `anchorDate` `deltaSteps` "pasos" según la unidad de tiempo de
 * `mode` (±1 día / ±7 días / ±1 mes) — ver Decisiones 4-6 del plan. En
 * "rango" no hay noción de "siguiente/anterior" (Decisión 7): retorna
 * `anchorDate` sin cambios; el hook de UI no debe invocar prev/next en ese
 * modo, esto es solo una salvaguarda defensiva.
 */
export function shiftAnchorForMode(
  mode: PeriodMode,
  anchorDate: string,
  deltaSteps: number,
): string {
  switch (mode) {
    case "dia":
      return shiftDateString(anchorDate, deltaSteps);
    case "semana":
      return shiftDateString(anchorDate, deltaSteps * 7);
    case "mes":
      return shiftMonthDateString(anchorDate, deltaSteps);
    case "rango":
      return anchorDate;
  }
}

/**
 * `true` si el periodo de `mode` anclado en `anchorDate` contiene `today` —
 * usado para decidir si mostrar el atajo "Ir a hoy"/"Semana actual"/"Mes
 * actual" (se oculta cuando ya se está viendo el periodo actual). En
 * "rango" siempre retorna `true`: no hay un "periodo actual" que ofrecer
 * como atajo ahí (Decisión 7 del plan) — el llamador oculta el atajo por
 * completo en ese modo.
 */
export function isCurrentPeriod(
  mode: PeriodMode,
  anchorDate: string,
  today: string,
): boolean {
  switch (mode) {
    case "dia":
      return anchorDate === today;
    case "semana":
      return getWeekDates(anchorDate).includes(today);
    case "mes": {
      const { startDate, endDate } = getMonthRange(anchorDate);
      return today >= startDate && today <= endDate;
    }
    case "rango":
      return true;
  }
}
