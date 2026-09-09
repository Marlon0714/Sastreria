export type ScheduleDiffableField =
  | "clientId"
  | "unregisteredClientName"
  | "date"
  | "time"
  | "price"
  | "abono"
  | "operarioId"
  | "notes"
  | "isPriority"
  | "category";

// Nota: `isOwnerFlagged` (Schedule) NO se incluye acá a propósito. Es una
// marca personal del dueño, oculta por completo a role="operario" en la UI
// (ver useOwnerOnlyVisibility); si se agregara a DIFFABLE_FIELDS, un
// operario que abre ScheduleHistoryList (que no filtra por rol) vería el
// cambio igual, ya que ese componente renderiza `changes` como JSON plano
// sin conocer quién lo mira. No "corregir" copiando el patrón de
// isPriority sin leer esto — ver Decisiones de Diseño en el plan
// schedule-owner-only-flag.md.
const DIFFABLE_FIELDS: readonly ScheduleDiffableField[] = [
  "clientId",
  "unregisteredClientName",
  "date",
  "time",
  "price",
  "abono",
  "operarioId",
  "notes",
  "isPriority",
  "category",
];

type DiffableSchedule = Partial<Record<ScheduleDiffableField, unknown>>;

export type FieldChanges = Record<string, { before: unknown; after: unknown }>;

/**
 * Compara los campos "de datos" de un turno (sin `status`, que se registra
 * aparte como su propio evento). Para `create`, pasar `{}` como `before` —
 * cada campo definido en `after` queda como "cambió de null a su valor".
 */
export function diffScheduleFields(
  before: DiffableSchedule,
  after: DiffableSchedule,
): FieldChanges {
  const changes: FieldChanges = {};

  for (const field of DIFFABLE_FIELDS) {
    const beforeValue = before[field] ?? null;
    const afterValue = after[field] ?? null;
    if (beforeValue !== afterValue) {
      changes[field] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}
