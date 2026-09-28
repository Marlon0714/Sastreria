import { AlphaType, ColorType, Skia } from "@shopify/react-native-skia";

import type { CapturedLabelBitmap } from "../../features/printing/domain/types";

/**
 * Decodifica el PNG en base64 capturado con `react-native-view-shot`
 * (`useArregloLabelCapture`) a píxeles RGBA crudos (4 bytes por píxel,
 * sin premultiplicar alpha) usando `@shopify/react-native-skia`. El
 * resultado alimenta `toMonochromeBitmap` (dominio puro, con test).
 *
 * Sin test unitario a propósito (regla del plan): requiere el motor nativo
 * de Skia, no disponible en el entorno de Jest.
 */
export function decodeCapturedLabelToRgbaPixels(
  captured: CapturedLabelBitmap,
): Uint8Array {
  const data = Skia.Data.fromBase64(captured.base64Png);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new Error("No se pudo decodificar la imagen de la etiqueta capturada");
  }

  const pixels = image.readPixels(0, 0, {
    width: captured.width,
    height: captured.height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels) {
    throw new Error("No se pudieron leer los píxeles de la etiqueta capturada");
  }

  return pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer);
}
