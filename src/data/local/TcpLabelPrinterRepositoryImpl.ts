import TcpSocket from "react-native-tcp-socket";

import type { LabelPrinterRepository } from "../../features/printing/domain/repository";
import type { PrinterTarget } from "../../features/printing/domain/types";

/**
 * Tiempo máximo de espera para establecer la conexión TCP antes de reportar
 * error (impresora apagada/fuera de la red WiFi es el caso más común).
 */
const CONNECT_TIMEOUT_MS = 5000;

/**
 * Adaptador único donde vive todo el conocimiento específico de
 * transporte/protocolo de impresión: socket TCP crudo al puerto 9100
 * (convención AppSocket/JetDirect, la más soportada por impresoras térmicas
 * WiFi genéricas) y envío directo de los bytes ESC/POS ya armados
 * (`buildEscPosLabelJob`). El dominio y los hooks solo conocen el puerto
 * `LabelPrinterRepository` — ninguna marca/protocolo se filtra fuera de este
 * archivo.
 *
 * Sin tests unitarios a propósito (regla del plan): es I/O real de red.
 * Su comportamiento contra hardware físico está pendiente de verificación
 * manual por el usuario (no hay impresora térmica disponible en este
 * entorno de desarrollo) — el spike de protocolo (GS v 0 sobre TCP:9100)
 * está documentado en el plan aprobado.
 */
export class TcpLabelPrinterRepositoryImpl implements LabelPrinterRepository {
  printLabelJob(target: PrinterTarget, job: Uint8Array): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const socket = TcpSocket.createConnection(
        {
          host: target.host,
          port: target.port,
          tls: false,
          connectTimeout: CONNECT_TIMEOUT_MS,
        },
        () => {
          socket.write(job, undefined, (error?: Error) => {
            socket.destroy();
            if (settled) {
              return;
            }
            settled = true;
            if (error) {
              reject(
                new Error(`No se pudo enviar la etiqueta a "${target.name}": ${error.message}`),
              );
              return;
            }
            resolve();
          });
        },
      );

      socket.on("error", (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        reject(
          new Error(
            `No se pudo conectar con la impresora "${target.name}" (${target.host}:${target.port}). Verifica que esté encendida y en la misma red WiFi.`,
          ),
        );
        // El error original queda registrado para depuración, sin exponerse al usuario.
        console.error(
          JSON.stringify({
            level: "error",
            service: "TcpLabelPrinterRepositoryImpl",
            message: "Fallo de conexión con impresora térmica",
            error: error.message,
          }),
        );
      });
    });
  }
}
