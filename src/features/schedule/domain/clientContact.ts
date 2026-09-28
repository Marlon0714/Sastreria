import type { Client } from "../../clients/domain/types";
import type { Schedule } from "./types";

/**
 * Nombre + teléfono (si hay cliente registrado) resueltos para un turno —
 * usado por la impresión de etiquetas de arreglo (`buildArregloLabelData`),
 * que necesita el teléfono además del nombre.
 */
export interface ClientContact {
  name: string;
  phone?: string;
}

/**
 * Deliberadamente duplica las ramas de resolución de `resolveClientLabel`
 * (`clientLabel.ts`) en vez de reutilizarlo + resolver el teléfono aparte:
 * `resolveClientLabel` ya se usa en 3 lugares estables
 * (`overdueSchedules.ts`, `scheduleListBucket.ts`, `account/domain/myActivity.ts`)
 * cuya firma no conviene tocar para agregarle un campo que solo necesita
 * impresión de etiquetas. Mismo criterio ya documentado en el comentario de
 * `resolveClientLabel` para no reabrir código estable sin necesidad — si
 * alguna de las dos funciones cambia su lógica de resolución, revisar la
 * otra.
 *
 * `client.phone` puede ser `""` (cliente sin teléfono registrado, ver
 * `primaryPhoneField` en `clients/domain/schemas.ts`) — se normaliza acá a
 * `undefined` para que el resto del dominio de impresión no tenga que
 * repetir el chequeo de string vacío.
 */
export function resolveClientContact(
  schedule: Pick<Schedule, "clientId" | "unregisteredClientName">,
  clientsById: ReadonlyMap<string, Client>,
): ClientContact {
  if (schedule.clientId) {
    const client = clientsById.get(schedule.clientId);
    if (!client) {
      return { name: "Cliente eliminado" };
    }
    return {
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phone ? client.phone : undefined,
    };
  }
  return { name: schedule.unregisteredClientName ?? "Cliente" };
}
