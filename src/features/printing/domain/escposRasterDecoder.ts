import type { MonochromeBitmap } from "./types";

/**
 * Se lanza cuando un job ESC/POS no tiene el formato exacto que produce
 * `buildEscPosLabelJob` (header corrupto o longitud inconsistente).
 */
export class EscPosJobFormatError extends Error {}

const ESC_INIT_BYTES = [0x1b, 0x40];
const RASTER_HEADER_PREFIX = [0x1d, 0x76, 0x30, 0x00];
const GS_CUT_PARTIAL_LENGTH = 4;
const MIN_JOB_LENGTH = ESC_INIT_BYTES.length + 8 + GS_CUT_PARTIAL_LENGTH;

function matchesBytes(job: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((byte, index) => job[offset + index] === byte);
}

/**
 * Decodifica un job ESC/POS ya armado por `buildEscPosLabelJob` de vuelta a
 * un `MonochromeBitmap`. Existe para poder probar por round-trip (codificar
 * → decodificar → debe dar el bitmap original) que el encoder es correcto,
 * sin necesitar una impresora física — ver también `scripts/print-simulator.js`,
 * que reutiliza este mismo formato (duplicado en JS plano ahí) para
 * reconstruir visualmente una etiqueta recibida por red.
 *
 * LIMITACIÓN IMPORTANTE: el job nunca serializa `bitmap.width` original, solo
 * `bytesPerRow` y `height` (ver `escposRaster.ts`). Este decoder solo puede
 * reconstruir `width = bytesPerRow * 8`, que coincide con el ancho original
 * únicamente cuando ese ancho ya era múltiplo de 8 — el caso real de
 * producción (`ARREGLO_LABEL_WIDTH_PX = 384 = 48 * 8`, ver `types.ts`). Para
 * un ancho que no sea múltiplo de 8, el valor original se pierde (los bits de
 * relleno del último byte de cada fila ya quedan en 0 desde `toMonochromeBitmap`
 * y son indistinguibles de columnas reales en blanco).
 */
export function decodeEscPosLabelJob(job: Uint8Array): MonochromeBitmap {
  if (job.length < MIN_JOB_LENGTH) {
    throw new EscPosJobFormatError(
      `Job demasiado corto: se esperaban al menos ${MIN_JOB_LENGTH} bytes, se recibieron ${job.length}.`,
    );
  }

  if (!matchesBytes(job, 0, ESC_INIT_BYTES)) {
    throw new EscPosJobFormatError("Header ESC_INIT inválido.");
  }

  if (!matchesBytes(job, 2, RASTER_HEADER_PREFIX)) {
    throw new EscPosJobFormatError("Header GS v 0 inválido o modo m distinto de 0.");
  }

  const bytesPerRow = job[6]! | (job[7]! << 8);
  const height = job[8]! | (job[9]! << 8);
  const expectedLength = ESC_INIT_BYTES.length + 8 + bytesPerRow * height + GS_CUT_PARTIAL_LENGTH;

  if (job.length !== expectedLength) {
    throw new EscPosJobFormatError(
      `Job truncado o con bytes sobrantes: se esperaban ${expectedLength} bytes, se recibieron ${job.length}.`,
    );
  }

  const dataStart = ESC_INIT_BYTES.length + 8;
  const data = job.slice(dataStart, dataStart + bytesPerRow * height);

  return { width: bytesPerRow * 8, height, bytesPerRow, data };
}
