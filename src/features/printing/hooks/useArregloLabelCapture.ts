import { useCallback, useRef, useState } from "react";
import { type LayoutChangeEvent, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import type { CapturedLabelBitmap } from "../domain/types";

/**
 * Envuelve `react-native-view-shot` para capturar `ArregloLabelView` como
 * PNG en base64. Se fuerza `width`/`height` explícitos en la opción de
 * captura, iguales al layout en puntos lógicos (dp) — así el PNG resultante
 * mide exactamente `ARREGLO_LABEL_WIDTH_PX` (384) píxeles de ancho, el ancho
 * físico de puntos que espera la impresora térmica, sin importar la densidad
 * de píxeles del dispositivo (`PixelRatio.get()`).
 *
 * Sin este forzado, `captureRef` renderiza a la resolución nativa del
 * dispositivo (dp × densidad, p. ej. 3x en muchos Android), y el bitmap
 * resultante queda 2-3 veces más ancho que los 384 puntos físicos del
 * cabezal de impresión — la impresora recibe un ráster con un ancho de fila
 * que no coincide con su buffer, y termina interpretando los bytes como
 * texto/comandos sueltos (símbolos ilegibles, avance de papel sin fin).
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

    const width = Math.round(layoutSize.width);
    const height = Math.round(layoutSize.height);

    const base64Png = await captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "base64",
      width,
      height,
    });

    return { base64Png, width, height };
  }, [layoutSize]);

  return { viewRef, onLayout, capture };
}
