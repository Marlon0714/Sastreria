export class LocalPrintQueueBusyError extends Error {
  constructor() {
    super(
      "Ya se está enviando otra etiqueta desde este dispositivo. Espera a que termine antes de iniciar otra impresión.",
    );
    this.name = "LocalPrintQueueBusyError";
  }
}

/**
 * No mantiene trabajos en espera: una impresión activa como máximo. Repetir
 * el mismo arreglo mientras está activo comparte su promesa para evitar un
 * duplicado local. No coordina dispositivos distintos.
 */
export class BoundedPrintQueue {
  private activeJobKey: string | undefined;
  private activeJob: Promise<void> | null = null;

  run(jobKey: string | undefined, send: () => Promise<void>): Promise<void> {
    if (this.activeJob) {
      if (jobKey && jobKey === this.activeJobKey) return this.activeJob;
      return Promise.reject(new LocalPrintQueueBusyError());
    }

    this.activeJobKey = jobKey;
    const job = Promise.resolve().then(send);
    this.activeJob = job.finally(() => {
      this.activeJob = null;
      this.activeJobKey = undefined;
    });
    return this.activeJob;
  }
}
