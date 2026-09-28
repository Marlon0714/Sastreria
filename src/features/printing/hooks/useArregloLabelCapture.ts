import { useCallback, useRef, useState } from "react";
import { PixelRatio, type LayoutChangeEvent, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import type { CapturedLabelBitmap } from "../domain/types";

/**
 * Envuelve `react-native-view-shot` para capturar `ArregloLabelView` como
 * PNG en base64, junto con sus dimensiones EN PÍXELES (no en puntos lógicos
 * — se multiplican por `PixelRatio.get()`, que es lo que espera
 * `SkiaPixelDecoder`/`toMonochromeBitmap`).
 *
 * Sin test unitario a propósito (regla del plan): depende del timing real de
 * layout + captura nativa de `react-native-view-shot`, no reproducible de
 * forma útil en Jest. `usePrintArregloLabel` (que sí está testeado) inyecta
 * su propia función `capture` mockeada para probar la orquestación sin
 * pasar por este hook.
 */
export function useArregloLabelCapture(): {
  viewRef: React.RefObject<View | null>;
  onLayout: (event: LayoutChangeEvent) => void;
  capture: () => Promise<CapturedLabelBitmap>;
} {
  const viewRef = useRef<View | null>(null);
  const [layoutSize, setLayoutSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayoutSize({ width, height });
  }, []);

  const capture = useCallback(async (): Promise<CapturedLabelBitmap> => {
    if (!viewRef.current || !layoutSize) {
      throw new Error("La etiqueta todavía no está lista para capturarse");
    }

    const base64Png = await captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "base64",
    });

    const pixelRatio = PixelRatio.get();
    return {
      base64Png,
      width: Math.round(layoutSize.width * pixelRatio),
      height: Math.round(layoutSize.height * pixelRatio),
    };
  }, [layoutSize]);

  return { viewRef, onLayout, capture };
}
