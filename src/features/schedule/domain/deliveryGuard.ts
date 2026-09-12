import { computeSaldo } from "./saldo";
import type { Schedule } from "./types";

/**
 * Resultado de evaluar si un turno puede marcarse "entregado" sin avisos, o
 * si conviene confirmar antes (precio sin registrar y/o saldo pendiente).
 * Dominio puro reutilizado por los 2 puntos de entrada a "marcar entregado"
 * (`ScheduleQuickActionSheet` y `ScheduleFormScreen`) — cada uno decide qué
 * `Alert.alert` mostrar con este resultado, pero el cálculo vive en un solo
 * lugar (ver Decisiones de Diseño del plan N-107: no se comparte el Alert en
 * sí, solo la decisión).
 */
export interface DeliveryGuardResult {
  missingPrice: boolean;
  saldoPendiente: number | undefined;
}

/**
 * `missingPrice` es `price == null || price === 0`: a diferencia de
 * `computeSaldo` (donde `price === 0` es un precio válido con saldo 0), acá
 * "precio en 0" se trata igual que "sin precio" porque ambos casos ameritan
 * el mismo aviso de "cárgalo antes de entregar" — el pedido original lo pide
 * explícitamente ("si el precio está vacío o en 0").
 */
export function evaluateDeliveryGuard(
  schedule: Pick<Schedule, "price" | "abono">,
): DeliveryGuardResult {
  return {
    missingPrice: schedule.price == null || schedule.price === 0,
    saldoPendiente: computeSaldo(schedule),
  };
}
