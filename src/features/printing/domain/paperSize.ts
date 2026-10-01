/**
 * Tamaño físico de un rollo/papel de impresión, en milímetros. `heightMm` es
 * opcional porque en impresoras de rollo continuo (recibos, muchas
 * etiquetadoras) el alto lo determina el contenido, no el papel — solo el
 * ancho es un límite físico fijo.
 */
export interface PaperSize {
  widthMm: number;
  heightMm?: number;
}

/**
 * Convierte milímetros a dots (píxeles físicos de impresión) para un DPI
 * dado. `dots = mm * dpi / 25.4` (25.4mm = 1 pulgada), redondeado al entero
 * más cercano — no tiene sentido pedirle a una impresora una fracción de dot.
 *
 * Existe para no tener anchos de impresión hardcodeados como números mágicos
 * (ej. `384`) sin su origen físico documentado: distintos papeles (adhesivo
 * de etiqueta vs. papel continuo de recibo) van a tener medidas en mm
 * distintas, y esta es la única función que hay que usar para pasar de
 * "cuánto mide el papel" a "cuántos dots le pido a la impresora".
 */
export function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}
