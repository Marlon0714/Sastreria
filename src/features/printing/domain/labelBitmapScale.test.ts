import { describe, expect, it } from "@jest/globals";

import { computeScaledHeight } from "./labelBitmapScale";

describe("computeScaledHeight", () => {
  it("escala hacia abajo preservando el aspect ratio", () => {
    expect(computeScaledHeight(1152, 900, 384)).toBe(300);
  });

  it("no cambia la altura cuando el ancho origen ya es el destino", () => {
    expect(computeScaledHeight(384, 300, 384)).toBe(300);
  });

  it("escala hacia arriba cuando el origen es más angosto que el destino", () => {
    expect(computeScaledHeight(192, 100, 384)).toBe(200);
  });

  it("nunca retorna una altura menor a 1", () => {
    expect(computeScaledHeight(1000, 0, 384)).toBe(1);
  });

  it("lanza un error si el ancho origen es cero o negativo", () => {
    expect(() => computeScaledHeight(0, 100, 384)).toThrow(
      "El ancho de la imagen capturada debe ser mayor que cero",
    );
    expect(() => computeScaledHeight(-10, 100, 384)).toThrow(
      "El ancho de la imagen capturada debe ser mayor que cero",
    );
  });
});
