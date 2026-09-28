import { useCallback, useState } from "react";

import { buildEscPosLabelJob } from "../domain/escposRaster";
import { toMonochromeBitmap } from "../domain/monochromeBitmap";
import type { CapturedLabelBitmap, PrinterTarget } from "../domain/types";
import { usePrintingDependencies } from "./PrintingDependenciesProvider";

interface PrintArregloLabelParams {
  capture: () => Promise<CapturedLabelBitmap>;
  target: PrinterTarget;
}

/**
 * Orquesta el flujo completo de impresión de una etiqueta de arreglo:
 * captura → decodifica píxeles → empaqueta a monocromo → arma el job
 * ESC/POS → lo envía a la impresora. Cada paso reutiliza una pieza de
 * dominio puro ya testeada por separado; este hook solo los encadena, por lo
 * que sus propios tests inyectan un `capture()` y unas `PrintingDependencies`
 * mockeadas (sin tocar Skia/TCP reales).
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
        const pixels = decodeLabelBitmap(captured);
        const bitmap = toMonochromeBitmap(pixels, captured.width, captured.height);
        const job = buildEscPosLabelJob(bitmap);
        await labelPrinterRepository.printLabelJob(target, job);
      } finally {
        setIsPrinting(false);
      }
    },
    [decodeLabelBitmap, labelPrinterRepository],
  );

  return { isPrinting, printLabel };
}
