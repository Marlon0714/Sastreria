import { useCallback, useRef, useState } from "react";
import { type LayoutChangeEvent, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import type { CapturedLabelBitmap } from "../domain/types";

/**
 * Envuelve `react-native-view-shot` para capturar `ArregloLabelView` como
 * PNG en base64 al doble del layout lógico para conservar detalle antes
 * del remuestreo. El tamaño enviado a la impresora se fija posteriormente
 * en `prepareArregloLabelBitmap`, no en la captura.
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
  const [layoutSize, setLayoutSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayoutSize({ width, height });
  }, []);

  const capture = useCallback(async (): Promise<CapturedLabelBitmap> => {
    if (!viewRef.current || !layoutSize) {
      throw new Error("La etiqueta todavía no está lista para capturarse");
    }

    const width = Math.round(layoutSize.width * 2);
    const height = Math.round(layoutSize.height * 2);

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
