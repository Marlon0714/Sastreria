import { buildEscPosBitImageJob, buildEscPosLabelJob } from "./escposRaster";
import { buildTsplBitmapJob } from "./tsplRaster";
import type { MonochromeBitmap, PrinterTarget, PrintProtocol } from "./types";

/**
 * Protocolo usado cuando una `PrinterTarget` no trae `protocol` explícito
 * (impresoras ya persistidas antes de este campo, o construidas a mano en
 * tests) — hoy es el único protocolo soportado.
 */
export const DEFAULT_PRINT_PROTOCOL: PrintProtocol = "escpos-raster";

/**
 * Convierte los datos ya preparados de un documento de impresión (`T`) en los
 * bytes finales a enviar a una impresora concreta. Deliberadamente genérico
 * (no atado a "label") para poder reutilizarse el día que exista, por
 * ejemplo, un `ReceiptRenderer = PrintRenderer<...>` sin rediseñar nada.
 */
export interface PrintRenderer<T> {
  render(data: T, printer: PrinterTarget): Uint8Array;
}

export type LabelRenderer = PrintRenderer<MonochromeBitmap>;

/**
 * Se lanza cuando una impresora declara un `protocol` que no tiene ningún
 * renderer registrado — protege ante datos corruptos en el storage local o
 * una unión `PrintProtocol` ampliada sin su entrada correspondiente en el
 * registro.
 */
export class UnsupportedPrintProtocolError extends Error {}

const LABEL_RENDERERS: Record<PrintProtocol, LabelRenderer> = {
  "escpos-raster": {
    render: (bitmap) => buildEscPosLabelJob(bitmap),
  },
  "escpos-bitimage": {
    render: (bitmap) => buildEscPosBitImageJob(bitmap),
  },
  "tspl-bitmap": {
    render: (bitmap) => buildTsplBitmapJob(bitmap),
  },
};

/**
 * Resuelve el `LabelRenderer` que sabe codificar una etiqueta para el
 * protocolo indicado. Este es el único lugar que hay que tocar el día que
 * se agregue un segundo protocolo (ej. "tspl-raster"): sumar la entrada acá,
 * sin cambiar hooks ni UI.
 */
export function resolveLabelRenderer(protocol: PrintProtocol): LabelRenderer {
  const renderer = LABEL_RENDERERS[protocol];
  if (!renderer) {
    throw new UnsupportedPrintProtocolError(
      `Protocolo de impresión no soportado: "${protocol}".`,
    );
  }
  return renderer;
}
