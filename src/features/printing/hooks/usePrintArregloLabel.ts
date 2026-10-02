import { useCallback, useState } from "react";

import { prepareArregloLabelBitmap } from "../domain/prepareLabelBitmap";
import { DEFAULT_PRINT_PROTOCOL, resolveLabelRenderer } from "../domain/printRenderer";
import type { CapturedLabelBitmap, PrinterTarget } from "../domain/types";
import { usePrintingDependencies } from "./PrintingDependenciesProvider";

interface PrintArregloLabelParams {
  capture: () => Promise<CapturedLabelBitmap>;
  target: PrinterTarget;
}

/**
 * Orquesta el flujo completo de impresión de una etiqueta de arreglo:
 * captura → decodifica píxeles → prepara el bitmap final (escala al tamaño
 * físico configurado + rota 90°, ver `prepareArregloLabelBitmap`) →
 * resuelve el renderer según el protocolo de la impresora destino → lo
 * envía. Cada paso reutiliza una pieza de dominio puro ya testeada por
 * separado; este hook solo los encadena, por lo que sus propios tests
 * inyectan un `capture()` y unas `PrintingDependencies` mockeadas (sin
 * tocar Skia/TCP reales).
 *
 * No atrapa errores a propósito: los deja propagar para que el componente
 * que llama (`PrintArregloLabelButton`) decida cómo mostrarlos
 * (`Alert.alert`) — los mensajes ya vienen en español y listos para
 * mostrarse (ver `TcpLabelPrinterRepositoryImpl`/`SkiaPixelDecoder`).
 */
export function usePrintArregloLabel(): {
  isPrinting: boolean;
  printLabel: (params: PrintArregloLabelParams) => Promise<void>;
} {
  const { decodeLabelBitmap, labelPrinterRepository } = usePrintingDependencies();
  const [isPrinting, setIsPrinting] = useState(false);

  const printLabel = useCallback(
    async ({ capture, target }: PrintArregloLabelParams): Promise<void> => {
      setIsPrinting(true);
      try {
        const captured = await capture();
        const decoded = decodeLabelBitmap(captured);
        const bitmap = prepareArregloLabelBitmap(decoded, target);
        const renderer = resolveLabelRenderer(target.protocol ?? DEFAULT_PRINT_PROTOCOL);
        const job = renderer.render(bitmap, target);
        await labelPrinterRepository.printLabelJob(target, job);
      } finally {
        setIsPrinting(false);
      }
    },
    [decodeLabelBitmap, labelPrinterRepository],
  );

  return { isPrinting, printLabel };
}
