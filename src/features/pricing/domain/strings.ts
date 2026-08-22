// Centraliza textos y mensajes de error para Pricing

/**
 * Formatea un precio en pesos colombianos de forma determinista (no depende del locale del SO).
 * Ejemplo: 10000 → "$10.000"
 * El signo (si lo hay) va ANTES del símbolo de moneda: -15000 → "-$15.000".
 */
export function formatPrice(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$${digits}`;
}

export const pricingStrings = {
  title: "Precios",
  addPricing: "Agregar precio",
  editPricing: "Editar precio",
  deletePricing: "Eliminar precio",
  confirmDelete: "¿Seguro que deseas eliminar este precio?",
  save: "Guardar",
  cancel: "Cancelar",
  required: "Este campo es obligatorio",
  invalidNumber: "Debe ser un número válido",
  offlineBanner: "Sin conexión: los cambios se guardarán localmente",
  syncPending: "Sincronización pendiente",
  syncError: "Error al sincronizar",
  syncSuccess: "Sincronizado correctamente",
  fetchError: "No se pudieron cargar los precios. Intenta de nuevo.",
  saveError: "No se pudo guardar el precio. Intenta de nuevo.",
  deleteError: "No se pudo eliminar el precio. Intenta de nuevo.",
  notFound: "Precio no encontrado",
};
