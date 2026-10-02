import type { MonochromeBitmap } from "./types";

/**
 * Se lanza cuando un job ESC/POS no tiene el formato exacto que produce
 * `buildEscPosLabelJob` (header corrupto o longitud inconsistente).
 */
export class EscPosJobFormatError extends Error {}

const ESC_INIT_BYTES = [0x1b, 0x40];
const RASTER_HEADER_PREFIX = [0x1d, 0x76, 0x30, 0x00];
/** `ESC J n` antes del corte (ver `ESC_FEED_BEFORE_CUT` en `escposRaster.ts`) — 3 bytes, el valor de `n` no importa para reconstruir el bitmap. */
const ESC_FEED_BEFORE_CUT_LENGTH = 3;
const GS_CUT_PARTIAL_LENGTH = 4;
const MIN_JOB_LENGTH =
  ESC_INIT_BYTES.length +
  8 +
  ESC_FEED_BEFORE_CUT_LENGTH +
  GS_CUT_PARTIAL_LENGTH;

function matchesBytes(
  job: Uint8Array,
  offset: number,
  expected: number[],
): boolean {
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
 * de una etiqueta de 400 dots de ancho tras rotar. Para
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
    throw new EscPosJobFormatError(
      "Header GS v 0 inválido o modo m distinto de 0.",
    );
  }

  const bytesPerRow = job[6]! | (job[7]! << 8);
  const height = job[8]! | (job[9]! << 8);
  const expectedLength =
    ESC_INIT_BYTES.length +
    8 +
    bytesPerRow * height +
    ESC_FEED_BEFORE_CUT_LENGTH +
    GS_CUT_PARTIAL_LENGTH;

  if (job.length !== expectedLength) {
    throw new EscPosJobFormatError(
      `Job truncado o con bytes sobrantes: se esperaban ${expectedLength} bytes, se recibieron ${job.length}.`,
    );
  }

  const dataStart = ESC_INIT_BYTES.length + 8;
  const data = job.slice(dataStart, dataStart + bytesPerRow * height);

  return { width: bytesPerRow * 8, height, bytesPerRow, data };
}

/**
 * Se lanza cuando un job no tiene el formato exacto que produce
 * `buildEscPosBitImageJob` (header corrupto, franja incompleta, o longitud
 * inconsistente).
 */
export class EscPosBitImageJobFormatError extends Error {}

const ESC_SET_LINE_SPACING_8_DOTS = [0x1b, 0x33, 0x08];
const ESC_BIT_IMAGE_HEADER_PREFIX = [0x1b, 0x2a, 0x00]; // ESC * m=0
const ESC_RESET_LINE_SPACING = [0x1b, 0x32];
const BIT_IMAGE_BAND_HEIGHT = 8;

/**
 * Decodifica un job armado por `buildEscPosBitImageJob` (comando `ESC *`) de
 * vuelta a un `MonochromeBitmap`. Igual que `decodeEscPosLabelJob`, existe
 * para probar por round-trip que el encoder no corrompe los datos sin
 * necesitar hardware real.
 *
 * LIMITACIÓN IMPORTANTE: a diferencia del formato `GS v 0`, este NUNCA
 * serializa la altura original en ningún lado — cada franja de `ESC *`
 * siempre representa 8 filas verticales, y los bits sobrantes de la última
 * franja (cuando la altura real no es múltiplo de 8) ya quedan en 0 desde
 * `buildEscPosBitImageJob` y son indistinguibles de filas reales en blanco.
 * Este decoder por eso SIEMPRE reconstruye `height` como un múltiplo exacto
 * de 8 (`bandas * 8`) — coincide con la altura original únicamente cuando
 * esta ya era múltiplo de 8. Para revisión visual (ver
 * `scripts/print-simulator.js`) esto es inofensivo: en el peor caso sobran
 * unas pocas filas en blanco al final de la imagen, invisibles contra el
 * fondo blanco.
 */
export function decodeEscPosBitImageJob(job: Uint8Array): MonochromeBitmap {
  let offset = 0;

  function expect(expected: number[], label: string): void {
    if (!matchesBytes(job, offset, expected)) {
      throw new EscPosBitImageJobFormatError(
        `${label} inválido en offset ${offset}.`,
      );
    }
    offset += expected.length;
  }

  if (job.length < ESC_INIT_BYTES.length + ESC_SET_LINE_SPACING_8_DOTS.length) {
    throw new EscPosBitImageJobFormatError("Job demasiado corto.");
  }
  expect(ESC_INIT_BYTES, "Header ESC_INIT");
  expect(ESC_SET_LINE_SPACING_8_DOTS, "Header ESC 3 8 (espaciado de línea)");

  const bands: Uint8Array[] = [];
  let width = 0;

  while (matchesBytes(job, offset, ESC_BIT_IMAGE_HEADER_PREFIX)) {
    offset += ESC_BIT_IMAGE_HEADER_PREFIX.length;
    if (job.length < offset + 2) {
      throw new EscPosBitImageJobFormatError("Header ESC * incompleto.");
    }
    const bandWidth = job[offset]! | (job[offset + 1]! << 8);
    offset += 2;

    if (bands.length === 0) {
      width = bandWidth;
    } else if (bandWidth !== width) {
      throw new EscPosBitImageJobFormatError(
        "Ancho inconsistente entre franjas.",
      );
    }

    if (job.length < offset + bandWidth + 1) {
      throw new EscPosBitImageJobFormatError("Franja de imagen truncada.");
    }
    const columnData = job.slice(offset, offset + bandWidth);
    offset += bandWidth;

    if (job[offset] !== 0x0a) {
      throw new EscPosBitImageJobFormatError(
        "Falta el salto de línea después de una franja.",
      );
    }
    offset += 1;

    bands.push(columnData);
  }

  expect(ESC_RESET_LINE_SPACING, "Header ESC 2 (restaurar espaciado)");
  const expectedRemaining = ESC_FEED_BEFORE_CUT_LENGTH + GS_CUT_PARTIAL_LENGTH;
  if (job.length - offset !== expectedRemaining) {
    throw new EscPosBitImageJobFormatError(
      `Job truncado o con bytes sobrantes: se esperaban ${expectedRemaining} bytes finales, quedaron ${job.length - offset}.`,
    );
  }

  const height = bands.length * BIT_IMAGE_BAND_HEIGHT;
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);

  bands.forEach((columnData, bandIndex) => {
    for (let x = 0; x < width; x += 1) {
      const byte = columnData[x] ?? 0;
      for (let bit = 0; bit < BIT_IMAGE_BAND_HEIGHT; bit += 1) {
        const pixelOn = (byte & (1 << (7 - bit))) !== 0;
        if (pixelOn) {
          const y = bandIndex * BIT_IMAGE_BAND_HEIGHT + bit;
          const byteIndex = y * bytesPerRow + Math.floor(x / 8);
          data[byteIndex] |= 1 << (7 - (x % 8));
        }
      }
    }
  });

  return { width, height, bytesPerRow, data };
}
