export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return formatDateString(new Date());
}

/**
 * Fecha local (no UTC) de un timestamp ISO (ej. readyAt/deliveredAt), para
 * agrupar por "el día en que pasó" según la hora del dispositivo, no la de
 * UTC — importante cerca de la medianoche.
 */
export function localDateFromIso(isoTimestamp: string): string {
  return formatDateString(new Date(isoTimestamp));
}

/**
 * Diferencia en días de CALENDARIO (no milisegundos crudos) entre
 * `fromDateString` y `toDateString` (ambas YYYY-MM-DD) — comparar
 * timestamps ISO crudos sería sensible a la hora del día. Terreno neutral
 * entre `dashboard` (vencidos/por vencer, validación de rango personalizado)
 * y `account` (Mis arreglos), precedente ya aceptado desde N-012.
 */
export function daysBetweenDates(fromDateString: string, toDateString: string): number {
  const [fromYear, fromMonth, fromDay] = fromDateString.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDateString.split("-").map(Number);
  const from = new Date(fromYear ?? 1970, (fromMonth ?? 1) - 1, fromDay ?? 1);
  const to = new Date(toYear ?? 1970, (toMonth ?? 1) - 1, toDay ?? 1);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / millisecondsPerDay);
}

export function shiftDateString(dateString: string, deltaDays: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + deltaDays);
  return formatDateString(date);
}

/**
 * Las 7 fechas (lunes a domingo) de la semana que contiene `dateString`.
 */
export function getWeekDates(dateString: string): string[] {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const weekday = date.getDay(); // 0=domingo..6=sábado
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = shiftDateString(dateString, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => shiftDateString(monday, i));
}

export function formatDateForDisplay(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Fecha corta sin año, ej. "Lunes 2 de agosto", para resultados de búsqueda.
 * Se arma manualmente (en vez de una sola llamada a toLocaleDateString con
 * weekday+day+month) porque es-CO antepone una coma al weekday largo y no
 * permite capitalizarlo vía opciones de Intl.
 */
export function formatWeekdayAndMonth(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const weekday = date.toLocaleDateString("es-CO", { weekday: "long" });
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthName = date.toLocaleDateString("es-CO", { month: "long" });
  return `${weekdayCapitalized} ${date.getDate()} de ${monthName}`;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

const SHORT_MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Primer y último día del mes que contiene `dateString`. El último día se
 * calcula con "día 0 del mes siguiente" (truco estándar de `Date`, ya
 * usado implícitamente en JS para restar un día) para no tener que
 * hardcodear la duración de cada mes ni lidiar con años bisiestos a mano.
 */
export function getMonthRange(dateString: string): DateRange {
  const [year, month] = dateString.split("-").map(Number);
  const safeYear = year ?? 1970;
  const safeMonthIndex = (month ?? 1) - 1;
  return {
    startDate: formatDateString(new Date(safeYear, safeMonthIndex, 1)),
    endDate: formatDateString(new Date(safeYear, safeMonthIndex + 1, 0)),
  };
}

/**
 * Desplaza `dateString` `deltaMonths` meses, normalizando SIEMPRE al día 1
 * del mes resultante — evita el bug clásico de sumar meses sobre un día que
 * no existe en el mes destino (ej. "31 de enero" + 1 mes no debe caer en
 * marzo por el desborde de `Date` al no tener 31 de febrero).
 */
export function shiftMonthDateString(
  dateString: string,
  deltaMonths: number,
): string {
  const [year, month] = dateString.split("-").map(Number);
  const safeYear = year ?? 1970;
  const safeMonthIndex = (month ?? 1) - 1;
  return formatDateString(new Date(safeYear, safeMonthIndex + deltaMonths, 1));
}

/**
 * Ej. "Septiembre 2026" — mes completo capitalizado + año, para el modo
 * "Mes" del selector de periodo del dashboard.
 */
export function formatMonthForDisplay(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const monthName = date.toLocaleDateString("es-CO", { month: "long" });
  const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${monthCapitalized} ${date.getFullYear()}`;
}

/**
 * Ej. "8 sep" — día + mes abreviado SIN año, para textos compactos que
 * concatenan dos fechas (ej. "Semana del 8 sep al 14 sep"). Se usa una
 * tabla propia de abreviaturas (en vez de `toLocaleDateString` con
 * `month: "short"`) porque `Intl` en es-CO devuelve abreviaturas con punto
 * (ej. "sept.", "may.") que no calzan con el formato compacto buscado.
 */
export function formatShortDate(dateString: string): string {
  const [, month, day] = dateString.split("-").map(Number);
  const monthLabel = SHORT_MONTH_LABELS[(month ?? 1) - 1] ?? "";
  return `${day ?? 1} ${monthLabel}`;
}
