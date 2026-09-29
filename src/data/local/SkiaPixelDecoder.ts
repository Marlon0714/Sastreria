import { AlphaType, ColorType, Skia } from "@shopify/react-native-skia";

import { computeScaledHeight } from "../../features/printing/domain/labelBitmapScale";
import { ARREGLO_LABEL_WIDTH_PX } from "../../features/printing/domain/types";
import type {
  CapturedLabelBitmap,
  DecodedLabelBitmap,
} from "../../features/printing/domain/types";

/**
 * Decodifica el PNG en base64 capturado con `react-native-view-shot`
 * (`useArregloLabelCapture`) y SIEMPRE lo reescala a `ARREGLO_LABEL_WIDTH_PX`
 * de ancho antes de leer los píxeles — nunca confía en
 * `captured.width`/`captured.height`, que son solo la solicitud que se le
 * pasó a `captureRef`, no una garantía de las dimensiones reales del PNG
 * producido. En hardware real se confirmó que esa solicitud puede no
 * cumplirse exactamente (`react-native-view-shot` puede redondear/ajustar la
 * resolución nativa), lo que desalinea el ancho de fila del ráster ESC/POS
 * `GS v 0` con el buffer de la impresora y produce símbolos ilegibles y avance
 * de papel descontrolado. Al leer el ancho/alto REALES del `SkImage`
 * decodificado y redibujar sobre una superficie CPU de tamaño fijo, el
 * ráster final queda garantizado a `ARREGLO_LABEL_WIDTH_PX` sin importar la
 * densidad de píxeles o el comportamiento exacto de la captura nativa.
 *
 * Sin test unitario a propósito (regla del plan): requiere el motor nativo
 * de Skia, no disponible en el entorno de Jest. La matemática de escalado
 * (`computeScaledHeight`) sí está aislada y testeada por separado.
 */
export function decodeCapturedLabelToRgbaPixels(
  captured: CapturedLabelBitmap,
): DecodedLabelBitmap {
  const data = Skia.Data.fromBase64(captured.base64Png);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new Error("No se pudo decodificar la imagen de la etiqueta capturada");
  }

  const sourceWidth = image.width();
  const sourceHeight = image.height();

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("La imagen de la etiqueta capturada no tiene dimensiones válidas");
  }

  const targetWidth = ARREGLO_LABEL_WIDTH_PX;
  const targetHeight = computeScaledHeight(sourceWidth, sourceHeight, targetWidth);

  const surface = Skia.Surface.Make(targetWidth, targetHeight);
  if (!surface) {
    throw new Error("No se pudo preparar el lienzo para reescalar la etiqueta");
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, sourceWidth, sourceHeight),
    Skia.XYWHRect(0, 0, targetWidth, targetHeight),
    Skia.Paint(),
  );
  surface.flush();

  const resized = surface.makeImageSnapshot();
  const pixels = resized.readPixels(0, 0, {
    width: targetWidth,
    height: targetHeight,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels) {
    throw new Error("No se pudieron leer los píxeles de la etiqueta capturada");
  }

  return {
    pixels: pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer),
    width: targetWidth,
    height: targetHeight,
  };
}
