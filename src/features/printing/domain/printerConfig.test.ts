import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_LABEL_PRINTER_PORT,
  PrinterConfigValidationError,
  createPrinterConfigSchema,
  parsePrinterConfigInput,
  printerConfigSchema,
} from "./printerConfig";

describe("printerConfigSchema", () => {
  it("acepta una configuración completa válida (caso feliz)", () => {
    const result = printerConfigSchema.safeParse({
      id: "6e6a9c2e-4a3b-4b1e-9f0a-0b0b0b0b0b0b",
      name: "Mostrador",
      host: "192.168.1.50",
      port: 9100,
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un puerto fuera de rango", () => {
    const result = printerConfigSchema.safeParse({
      id: "6e6a9c2e-4a3b-4b1e-9f0a-0b0b0b0b0b0b",
      name: "Mostrador",
      host: "192.168.1.50",
      port: 70000,
    });

    expect(result.success).toBe(false);
  });

  it("rechaza un host con caracteres no permitidos", () => {
    const result = printerConfigSchema.safeParse({
      id: "6e6a9c2e-4a3b-4b1e-9f0a-0b0b0b0b0b0b",
      name: "Mostrador",
      host: "192.168.1.50/../etc",
      port: 9100,
    });

    expect(result.success).toBe(false);
  });
});

describe("createPrinterConfigSchema", () => {
  it("usa el puerto por defecto (9100) cuando no se especifica ninguno", () => {
    const result = createPrinterConfigSchema.safeParse({
      name: "Taller",
      host: "impresora-taller",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe(DEFAULT_LABEL_PRINTER_PORT);
    }
  });

  it("rechaza un nombre vacío", () => {
    const result = createPrinterConfigSchema.safeParse({
      name: "",
      host: "impresora-taller",
    });

    expect(result.success).toBe(false);
  });
});

describe("parsePrinterConfigInput", () => {
  it("devuelve el input parseado (caso feliz)", () => {
    const parsed = parsePrinterConfigInput({ name: "Mostrador", host: "192.168.1.50", port: 9100 });

    expect(parsed).toEqual({ name: "Mostrador", host: "192.168.1.50", port: 9100 });
  });

  it("lanza PrinterConfigValidationError con un mensaje en español si el input es inválido", () => {
    expect(() => parsePrinterConfigInput({ name: "", host: "192.168.1.50" })).toThrow(
      PrinterConfigValidationError,
    );
  });
});
