import { AlphaType, ColorType, Skia } from "@shopify/react-native-skia";

import type {
  CapturedLabelBitmap,
  DecodedLabelBitmap,
} from "../../features/printing/domain/types";

/**
 * Lee los píxeles a la resolución real del PNG, sin reducir el detalle de
 * la captura. `prepareArregloLabelBitmap` realiza el único remuestreo al
 * tamaño físico del cabezal antes de codificar el job de impresión.
 */
export function decodeCapturedLabelToRgbaPixels(
  captured: CapturedLabelBitmap,
): DecodedLabelBitmap {
  const data = Skia.Data.fromBase64(captured.base64Png);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new Error(
      "No se pudo decodificar la imagen de la etiqueta capturada",
    );
  }

  const sourceWidth = image.width();
  const sourceHeight = image.height();

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error(
      "La imagen de la etiqueta capturada no tiene dimensiones válidas",
    );
  }

  const surface = Skia.Surface.Make(sourceWidth, sourceHeight);
  if (!surface) {
    throw new Error("No se pudo preparar el lienzo para reescalar la etiqueta");
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, sourceWidth, sourceHeight),
    Skia.XYWHRect(0, 0, sourceWidth, sourceHeight),
    Skia.Paint(),
  );
  surface.flush();

  const resized = surface.makeImageSnapshot();
  const pixels = resized.readPixels(0, 0, {
    width: sourceWidth,
    height: sourceHeight,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels) {
    throw new Error("No se pudieron leer los píxeles de la etiqueta capturada");
  }

  return {
    pixels:
      pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer),
    width: sourceWidth,
    height: sourceHeight,
  };
}
