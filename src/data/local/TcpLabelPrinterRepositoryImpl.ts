import TcpSocket from "react-native-tcp-socket";

import type { LabelPrinterRepository } from "../../features/printing/domain/repository";
import type { PrinterTarget } from "../../features/printing/domain/types";
import { BoundedPrintQueue } from "./BoundedPrintQueue";

/**
 * El timeout de conexión más el límite total de envío hacen fallar rápido
 * cuando no hay una impresora disponible en la red del taller.
 */
const CONNECT_TIMEOUT_MS = 3500;
const PRINT_TIMEOUT_MS = 6500;

/**
 * Adaptador único donde vive todo el conocimiento específico de
 * transporte/protocolo de impresión: socket TCP crudo al puerto 9100
 * (convención AppSocket/JetDirect, la más soportada por impresoras térmicas
 * WiFi genéricas) y envío directo de los bytes ESC/POS ya armados
 * (`buildEscPosLabelJob`). El dominio y los hooks solo conocen el puerto
 * `LabelPrinterRepository` — ninguna marca/protocolo se filtra fuera de este
 * archivo.
 *
 * El socket requiere verificación manual con impresora física; la cola local
 * se cubre aparte en `BoundedPrintQueue.test.ts`.
 */
export class TcpLabelPrinterRepositoryImpl implements LabelPrinterRepository {
  private readonly queue = new BoundedPrintQueue();

  printLabelJob(
    target: PrinterTarget,
    job: Uint8Array,
    jobKey?: string,
  ): Promise<void> {
    return this.queue.run(jobKey, () => this.sendJob(target, job));
  }

  private sendJob(target: PrinterTarget, job: Uint8Array): Promise<void> {
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
            if (error) {
              fail(
                new Error(
                  `No se pudo enviar el trabajo a "${target.name}". Revisa que la impresora admita el protocolo configurado y que su puerto de impresión esté habilitado.`,
                ),
                "write_failed",
              );
              return;
            }
            finish();
          });
        },
      );

      const timeout = setTimeout(() => {
        fail(
          new Error(
            `La impresora no respondió en ${PRINT_TIMEOUT_MS / 1000} segundos. Comprueba que esté encendida, en la misma red Wi-Fi del taller y que la IP y el puerto sean correctos.`,
          ),
          "timeout",
        );
      }, PRINT_TIMEOUT_MS);

      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve();
      };

      const fail = (error: Error, errorCode: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
        console.error(
          JSON.stringify({
            level: "error",
            service: "TcpLabelPrinterRepositoryImpl",
            message: "Falló el envío TCP de una etiqueta",
            errorCode,
          }),
        );
      };

      socket.on("error", (error: Error) => {
        const errorCode =
          "code" in error && typeof error.code === "string"
            ? error.code
            : "connection_failed";
        const message =
          errorCode === "ECONNREFUSED"
            ? `La impresora rechazó la conexión en ${target.host}:${target.port}. Verifica su IP y puerto de impresión.`
            : errorCode === "ENETUNREACH" || errorCode === "EHOSTUNREACH"
              ? "No se alcanza la impresora desde esta red. Conecta el dispositivo al Wi-Fi del taller y revisa la IP."
              : errorCode === "ETIMEDOUT"
                ? "Se agotó el tiempo de conexión. Comprueba que la impresora esté encendida y conectada al Wi-Fi del taller."
                : `No se pudo conectar con la impresora "${target.name}". Verifica que esté encendida y en la misma red Wi-Fi del taller.`;
        fail(new Error(message), errorCode);
      });
    });
  }
}
