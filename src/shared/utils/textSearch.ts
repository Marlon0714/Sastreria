export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export interface NamedContact {
  firstName: string;
  lastName: string;
}

/**
 * Busca un homónimo exacto (nombre+apellido, sin distinguir acentos/mayúsculas)
 * en una lista ya cargada. Útil para advertir antes de crear un cliente
 * duplicado por accidente cuando dos personas distintas comparten nombre.
 */
export function findDuplicateByName<T extends NamedContact>(
  items: readonly T[],
  firstName: string,
  lastName: string,
): T | null {
  const normalizedTarget = normalizeText(`${firstName} ${lastName}`);
  if (!normalizedTarget) {
    return null;
  }

  return (
    items.find(
      (item) =>
        normalizeText(`${item.firstName} ${item.lastName}`) ===
        normalizedTarget,
    ) ?? null
  );
}
