export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return formatDateString(new Date());
}

export function shiftDateString(dateString: string, deltaDays: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + deltaDays);
  return formatDateString(date);
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
