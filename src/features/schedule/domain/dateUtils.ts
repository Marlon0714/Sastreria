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
