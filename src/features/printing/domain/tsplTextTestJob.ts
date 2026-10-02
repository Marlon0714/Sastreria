import type { PaperSize } from "./paperSize";

/**
 * Arma un script TSPL mínimo de solo texto (comandos `SIZE`/`GAP`/`CLS`/
 * `TEXT`/`PRINT`, ver manual de programación TSC TSPL/TSPL2) para probar si
 * una impresora en "modo etiqueta" entiende TSPL — ese modo no respondió a
 * ningún comando ESC/POS (ni siquiera el texto plano más simple,
 * `buildEscPosTextTestJob`), lo que sugiere que habla un protocolo
 * completamente distinto.
 *
 * Es deliberadamente un diagnóstico aislado, no un renderer real: no pasa
 * por `PrintRenderer`/el registro de protocolos de `printRenderer.ts`. Si
 * esto imprime algo reconocible en hardware real, confirma que hace falta
 * construir un renderer TSPL completo (reutilizando `MonochromeBitmap` vía
 * el comando `BITMAP` de TSPL); si no imprime nada, hay que investigar otro
 * protocolo (ej. CPCL) antes de invertir más tiempo.
 */
export function buildTsplTextTestJob(lines: string[], paperSize: PaperSize): Uint8Array {
  const heightMm = paperSize.heightMm ?? paperSize.widthMm;
  const commands: string[] = [
    `SIZE ${paperSize.widthMm} mm,${heightMm} mm`,
    "GAP 2 mm,0 mm",
    "CLS",
    ...lines.map((line, index) => `TEXT 10,${10 + index * 30},"3",0,1,1,"${line}"`),
    "PRINT 1",
  ];

  const script = commands.join("\r\n") + "\r\n";
  const bytes = new Uint8Array(script.length);
  for (let i = 0; i < script.length; i += 1) {
    bytes[i] = script.charCodeAt(i) & 0xff;
  }
  return bytes;
}
