import type { MonochromeBitmap } from "./types";

/**
 * ESC @ — inicializa la impresora (limpia buffer/estado previo). Se envía
 * antes del ráster para que la etiqueta no herede configuración de un
 * trabajo anterior.
 */
const ESC_INIT = new Uint8Array([0x1b, 0x40]);

/**
 * GS V 66 0 — corte parcial de papel (m=66 "feed and partial cut"), estándar
 * ESC/POS soportado por la gran mayoría de impresoras térmicas compatibles.
 * Se envía al final para separar la etiqueta impresa de la siguiente.
 */
const GS_CUT_PARTIAL = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

/**
 * Arma el comando ráster ESC/POS `GS v 0` (`0x1D 0x76 0x30`) a partir de un
 * bitmap monocromo ya empaquetado (ver `toMonochromeBitmap`). Formato del
 * comando: `GS v 0 m xL xH yL yH d1...dk`, con:
 * - m = 0 (modo normal, sin escalado)
 * - xL/xH = bytesPerRow en little-endian (16 bits)
 * - yL/yH = height en little-endian (16 bits)
 * - d1..dk = los bytes del bitmap, fila por fila
 *
 * Pendiente de verificación manual contra hardware real (no se tiene acceso
 * a una impresora física en este entorno) — el spike de la convención
 * AppSocket/JetDirect (puerto 9100) y del comando `GS v 0` está documentado
 * en el plan; este archivo es dominio puro y se cubre con tests, pero el
 * comportamiento end-to-end con una impresora concreta queda pendiente de
 * validación manual por el usuario.
 */
export function buildEscPosLabelJob(bitmap: MonochromeBitmap): Uint8Array {
  const xL = bitmap.bytesPerRow & 0xff;
  const xH = (bitmap.bytesPerRow >> 8) & 0xff;
  const yL = bitmap.height & 0xff;
  const yH = (bitmap.height >> 8) & 0xff;

  const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

  const job = new Uint8Array(
    ESC_INIT.length + header.length + bitmap.data.length + GS_CUT_PARTIAL.length,
  );
  let offset = 0;
  job.set(ESC_INIT, offset);
  offset += ESC_INIT.length;
  job.set(header, offset);
  offset += header.length;
  job.set(bitmap.data, offset);
  offset += bitmap.data.length;
  job.set(GS_CUT_PARTIAL, offset);

  return job;
}
