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

export interface PhoneContact {
  id: string;
  phone: string;
  phones?: string[];
}

/**
 * Busca si algún cliente ya tiene el teléfono dado (comparando su teléfono
 * principal y los secundarios). Se excluye `excludeId` para no marcar como
 * "duplicado" al propio cliente cuando se está editando.
 */
export function findDuplicateByPhone<T extends PhoneContact>(
  items: readonly T[],
  candidatePhone: string,
  excludeId?: string,
): T | null {
  const normalizedTarget = normalizePhone(candidatePhone);
  if (!normalizedTarget) {
    return null;
  }

  return (
    items.find((item) => {
      if (item.id === excludeId) {
        return false;
      }
      const itemPhones = [item.phone, ...(item.phones ?? [])];
      return itemPhones.some(
        (phone) => normalizePhone(phone) === normalizedTarget,
      );
    }) ?? null
  );
}
