import TcpSocket from "react-native-tcp-socket";

import type { PrinterDiscoveryRepository } from "../../features/printing/domain/repository";

/**
 * Cantidad de hosts probados en paralelo por lote. Acotado (no todos los ~254
 * hosts de una vez) para no saturar el stack de red del dispositivo ni
 * disparar falsos negativos por contención — ver límites explícitos del plan
 * de descubrimiento ("costo acotado y predecible").
 */
const CONCURRENT_PROBES = 25;

/**
 * Intenta conectarse a `host:port`. Resuelve con el propio `host` si la
 * conexión se establece (hay algo escuchando en el puerto 9100, la señal que
 * usamos como "esto probablemente es una impresora"), o con `null` si falla o
 * excede `timeoutMs`. Nunca rechaza: un host que no responde es un resultado
 * esperado y frecuente al escanear un rango /24 completo, no un error.
 *
 * Mismo patrón try/`settled`/`destroy()` que `TcpLabelPrinterRepositoryImpl`
 * para evitar resolver dos veces ante una carrera entre el callback de
 * conexión y el evento `error`.
 */
function probeHost(host: string, port: number, timeoutMs: number): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let settled = false;

    const socket = TcpSocket.createConnection(
      { host, port, tls: false, connectTimeout: timeoutMs },
      () => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        resolve(host);
      },
    );

    socket.on("error", () => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(null);
    });
  });
}

/**
 * Adaptador único de descubrimiento de impresoras: reutiliza
 * `TcpSocket.createConnection` (misma dependencia que ya usa
 * `TcpLabelPrinterRepositoryImpl`) para probar en paralelo, con concurrencia
 * limitada, qué hosts candidatos de la subred tienen el puerto 9100 abierto.
 *
 * Sin tests unitarios a propósito (regla del plan): es I/O real de red, igual
 * que `TcpLabelPrinterRepositoryImpl`.
 */
export class TcpPrinterDiscoveryRepositoryImpl implements PrinterDiscoveryRepository {
  async scanPort(
    hosts: string[],
    port: number,
    timeoutMs: number,
    onProgress?: (checked: number, total: number) => void,
  ): Promise<string[]> {
    const found: string[] = [];

    for (let offset = 0; offset < hosts.length; offset += CONCURRENT_PROBES) {
      const batch = hosts.slice(offset, offset + CONCURRENT_PROBES);
      const batchResults = await Promise.all(
        batch.map((host) => probeHost(host, port, timeoutMs)),
      );

      for (const result of batchResults) {
        if (result) {
          found.push(result);
        }
      }

      onProgress?.(Math.min(offset + CONCURRENT_PROBES, hosts.length), hosts.length);
    }

    return found;
  }
}
