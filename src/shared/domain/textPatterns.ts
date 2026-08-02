export const PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u;
export const PHONE_DIGITS_PATTERN = /^\+?\d+$/;
export const ID_DIGITS_PATTERN = /^\d+$/;
export const SIZE_VALUE_PATTERN = /^[\p{L}\d\s/-]+$/u;
export const SAFE_FREE_TEXT_PATTERN = /^[^<>{}`]*$/;

export function normalizeDigitsInput(value: string): string {
  return value.replace(/[\s.\-()]/g, "");
}
