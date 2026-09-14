/**
 * Parseo de texto de un `TextInput` de precio/abono a un monto numérico o
 * `undefined` (campo vacío). Solo dígitos: un "." acá se confundiría con el
 * separador de miles que `formatPrice` usa al MOSTRAR precios en el resto de
 * la app, y "15.000" se leería como 15 en vez de 15000 (ver PricingForm.tsx).
 * Dominio puro reutilizado por los campos `price`/`abono` de
 * `ScheduleFormScreen` y por la tarjeta de precio inline de
 * `ScheduleQuickActionSheet` — un único lugar para no triplicar el mismo
 * parseo.
 */
export function parseDigitsOnlyAmount(text: string): number | undefined {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  return digitsOnly === "" ? undefined : parseInt(digitsOnly, 10);
}
