import { ARREGLO_LABEL_DPI } from "./types";
import type { MonochromeBitmap } from "./types";

const DOTS_PER_MM = ARREGLO_LABEL_DPI / 25.4;

/**
 * Separación asumida entre etiquetas en el rollo (ver `GAP` en el manual de
 * programación TSC TSPL/TSPL2) — mismo valor ya probado en
 * `buildTsplTextTestJob` (el spike de diagnóstico que confirmó que "modo
 * etiqueta" sí habla TSPL).
 */
const GAP_MM = 2;

function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Arma un job TSPL que imprime un `MonochromeBitmap` ya preparado vía
 * `SIZE`/`GAP`/`CLS`/`BITMAP`/`PRINT`. Es el renderer real para "modo
 * etiqueta" (que no entiende ESC/POS en absoluto) — construido recién
 * después de confirmar con `buildTsplTextTestJob` que ese modo sí
 * interpreta TSPL.
 *
 * POLARIDAD DE BITS: `MonochromeBitmap` usa bit=1 → negro/imprime (ver
 * `monochromeBitmap.ts`), la convención que esperan los comandos ráster
 * ESC/POS (`GS v 0`/`ESC *`). El comando `BITMAP` de TSPL resultó usar la
 * convención CONTRARIA (confirmado en hardware real: sin invertir, la
 * etiqueta salía con el fondo negro sólido y el texto en blanco) — por eso
 * se invierte cada byte (`^ 0xff`) antes de empacarlo acá, sin tocar
 * `toMonochromeBitmap` ni los renderers ESC/POS, que ya están correctos.
 *
 * El ancho/alto físico en mm que declara `SIZE` se recupera a partir de las
 * dimensiones del bitmap ya escalado (ver `scalePixels.ts`/`rotatePixels.ts`
 * en `usePrintArregloLabel.ts`) y el DPI asumido — así el renderer no
 * necesita que le pasen el `PaperSize` por separado, misma firma que los
 * renderers ESC/POS.
 */
export function buildTsplBitmapJob(bitmap: MonochromeBitmap): Uint8Array {
  const widthMm = Math.round(bitmap.width / DOTS_PER_MM);
  const heightMm = Math.round(bitmap.height / DOTS_PER_MM);

  const header = encodeAscii(
    [
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${GAP_MM} mm,0 mm`,
      "CLS",
      `BITMAP 0,0,${bitmap.bytesPerRow},${bitmap.height},0,`,
    ].join("\r\n"),
  );
  const footer = encodeAscii("\r\nPRINT 1\r\n");
  const invertedData = bitmap.data.map((byte) => byte ^ 0xff);

  const job = new Uint8Array(header.length + invertedData.length + footer.length);
  let offset = 0;
  job.set(header, offset);
  offset += header.length;
  job.set(invertedData, offset);
  offset += invertedData.length;
  job.set(footer, offset);

  return job;
}
