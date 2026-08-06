/**
 * Paleta unificada de la app (confirmada 2026-08-04): antes cada feature
 * usaba su propio "primario" (teal en Agenda, azul en Precios) sin criterio
 * único. Un solo azul primario en toda la app; verde/rojo reservados para
 * significado real (éxito/peligro), no como decoración suelta.
 */
export const colors = {
  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  primarySoft: "#dbeafe",

  success: "#16a34a",
  successSoft: "#dcfce7",

  danger: "#dc2626",
  dangerSoft: "#fee2e2",

  warning: "#d97706",
  warningSoft: "#fef3c7",

  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textPlaceholder: "#94a3b8",

  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  background: "#f8fafc",
  surface: "#ffffff",
} as const;
