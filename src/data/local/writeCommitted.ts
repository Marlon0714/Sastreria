export type WriteCommittedCallback = () => void | Promise<void>;

export interface WriteCommittedOptions {
  onWriteCommitted?: WriteCommittedCallback;
}

/**
 * Dispara el callback de sync tras un write local, sin bloquear ni propagar
 * errores del propio disparo (fire-and-forget). Patrón compartido por todos
 * los repositorios que participan en el sync de Supabase.
 */
export function notifyWriteCommitted(options: WriteCommittedOptions): void {
  if (!options.onWriteCommitted) {
    return;
  }
  void Promise.resolve(options.onWriteCommitted()).catch(() => undefined);
}
