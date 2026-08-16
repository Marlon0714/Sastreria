export const PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u;
export const PHONE_DIGITS_PATTERN = /^\+?\d+$/;
export const ID_DIGITS_PATTERN = /^\d+$/;
export const SIZE_VALUE_PATTERN = /^[\p{L}\d\s/-]+$/u;
export const SAFE_FREE_TEXT_PATTERN = /^[^<>{}`]*$/;

export function normalizeDigitsInput(value: string): string {
  return value.replace(/[\s.\-()]/g, "");
}

/**
 * Pone en mayúscula la primera letra de cada palabra (y de cada parte de
 * palabras compuestas con guion) y el resto en minúscula, para que un
 * nombre se guarde siempre con el mismo formato sin importar cómo se haya
 * escrito (ej. "juan PEREZ" o "MARÍA jose" → "Juan Perez"/"María Jose").
 */
export function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part.length > 0
            ? part[0]!.toLocaleUpperCase("es") + part.slice(1).toLocaleLowerCase("es")
            : part,
        )
        .join("-"),
    )
    .join(" ");
}
