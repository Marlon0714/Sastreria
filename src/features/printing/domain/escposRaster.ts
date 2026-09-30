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

/**
 * `ESC 3 n` — fija el espaciado entre líneas a `n` puntos. Se usa antes de
 * imprimir la imagen en modo bit-image para que cada salto de línea avance
 * el papel exactamente lo que mide la franja recién impresa (8 puntos), sin
 * dejar huecos ni superposición entre franjas.
 */
const ESC_SET_LINE_SPACING_8_DOTS = new Uint8Array([0x1b, 0x33, 0x08]);

/** `ESC 2` — restaura el espaciado de línea por defecto (1/6 de pulgada). */
const ESC_RESET_LINE_SPACING = new Uint8Array([0x1b, 0x32]);

const LINE_FEED = new Uint8Array([0x0a]);

/** Alto de cada franja del comando `ESC * m=0` (modo "8-dot single density"). */
const BIT_IMAGE_BAND_HEIGHT = 8;

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Arma un job de imagen usando el comando ESC/POS `ESC *` (modo bit-image de
 * 8 puntos, `m=0`) en vez del comando ráster `GS v 0` que usa
 * `buildEscPosLabelJob`. Existe como alternativa de diagnóstico: `GS v 0` es
 * un comando más nuevo y no todas las impresoras ESC/POS (sobre todo modelos
 * económicos o más viejos) lo soportan — si una impresora imprime símbolos
 * ilegibles en vez de la etiqueta, puede ser porque no reconoce `GS v 0` y
 * termina interpretando esos bytes como texto suelto. `ESC *` es el comando
 * de imagen "clásico", casi universalmente soportado.
 *
 * A diferencia de `GS v 0` (una fila = un byte cada 8 píxeles horizontales),
 * `ESC *` codifica por COLUMNAS: cada byte representa 8 píxeles verticales de
 * una misma columna, y hay que repetir el comando una vez por cada franja de
 * 8 filas de alto (`BIT_IMAGE_BAND_HEIGHT`), con un salto de línea entre
 * franjas ajustado a esa misma altura (`ESC 3 8`) para que no queden huecos.
 */
export function buildEscPosBitImageJob(bitmap: MonochromeBitmap): Uint8Array {
  const { width, height, bytesPerRow, data } = bitmap;
  const chunks: Uint8Array[] = [ESC_INIT, ESC_SET_LINE_SPACING_8_DOTS];

  for (let bandStart = 0; bandStart < height; bandStart += BIT_IMAGE_BAND_HEIGHT) {
    const bandHeight = Math.min(BIT_IMAGE_BAND_HEIGHT, height - bandStart);
    const header = new Uint8Array([0x1b, 0x2a, 0x00, width & 0xff, (width >> 8) & 0xff]);
    const columnData = new Uint8Array(width);

    for (let x = 0; x < width; x += 1) {
      let byte = 0;
      for (let bit = 0; bit < bandHeight; bit += 1) {
        const sourceByte = data[(bandStart + bit) * bytesPerRow + Math.floor(x / 8)] ?? 0;
        const pixelOn = (sourceByte & (1 << (7 - (x % 8)))) !== 0;
        if (pixelOn) {
          byte |= 1 << (7 - bit);
        }
      }
      columnData[x] = byte;
    }

    chunks.push(header, columnData, LINE_FEED);
  }

  chunks.push(ESC_RESET_LINE_SPACING, GS_CUT_PARTIAL);

  return concatUint8Arrays(chunks);
}

/**
 * Codifica texto ASCII a bytes crudos (sin acentos/ñ — este job es solo para
 * diagnóstico técnico, no para etiquetas reales).
 */
function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Arma un trabajo ESC/POS de solo texto plano (sin el comando ráster
 * `GS v 0`, sin pasar por captura/Skia/monocromo). Sirve como prueba de
 * diagnóstico: si esto imprime limpio en una sola hoja pero la etiqueta con
 * imagen sigue saliendo con símbolos ilegibles en varias hojas, el problema
 * está en la conversión de imagen a bitmap (captura/decodificación/empacado),
 * no en la conexión TCP ni en el soporte ESC/POS de la impresora.
 */
export function buildEscPosTextTestJob(lines: string[]): Uint8Array {
  const textBytes = encodeAscii(lines.join("\n") + "\n\n");

  const job = new Uint8Array(ESC_INIT.length + textBytes.length + GS_CUT_PARTIAL.length);
  let offset = 0;
  job.set(ESC_INIT, offset);
  offset += ESC_INIT.length;
  job.set(textBytes, offset);
  offset += textBytes.length;
  job.set(GS_CUT_PARTIAL, offset);

  return job;
}
