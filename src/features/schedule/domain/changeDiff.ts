export type ScheduleDiffableField =
  | "clientId"
  | "date"
  | "time"
  | "price"
  | "operarioId"
  | "notes";

const DIFFABLE_FIELDS: readonly ScheduleDiffableField[] = [
  "clientId",
  "date",
  "time",
  "price",
  "operarioId",
  "notes",
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
