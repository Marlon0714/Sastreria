import { computeSaldo } from "../../schedule/domain/saldo";
import type { Schedule } from "../../schedule/domain/types";
import type { ClientContact } from "../../schedule/domain/clientContact";
import type { ArregloLabelData } from "./types";

/**
 * Arma los datos crudos de la etiqueta de un turno "arreglo". Reutiliza
 * `computeSaldo` (no recalcula price - abono acá) para no desincronizarse si
 * su lógica cambia. El formateo (moneda, fecha) se hace después, en el punto
 * de uso (`ArregloLabelView`), reutilizando `formatPrice` y
 * `formatDateForDisplay`.
 */
export function buildArregloLabelData(
  schedule: Pick<Schedule, "date" | "price" | "abono">,
  contact: ClientContact,
): ArregloLabelData {
  return {
    clientName: contact.name,
    clientPhone: contact.phone,
    date: schedule.date,
    price: schedule.price,
    abono: schedule.abono,
    saldo: computeSaldo(schedule),
  };
}
