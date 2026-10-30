import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabasePrinterSettingsRepository } from "./SupabasePrinterSettingsRepository";

interface SettingsRow {
  printers: unknown;
  default_printer_id: unknown;
  updated_at: string;
}

const mockMaybeSingle =
  jest.fn<
    () => Promise<{ data: SettingsRow | null; error: { message: string } | null }>
  >();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert = jest.fn(async () => ({ error: null }));
const mockUpdateMaybeSingle =
  jest.fn<
    () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  >();
const mockUpdateSelect = jest.fn(() => ({
  maybeSingle: mockUpdateMaybeSingle,
}));
const mockUpdateEq = jest.fn(() => ({ select: mockUpdateSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
  update: mockUpdate,
}));

jest.mock("./client", () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

describe("SupabasePrinterSettingsRepository", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockUpdateMaybeSingle.mockReset();
    mockUpdateEq.mockClear();
    mockUpdateSelect.mockClear();
    mockUpdate.mockClear();
    mockFrom.mockClear();
  });

  it("lee la fila singleton compartida y sanea la predeterminada", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        printers: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Mostrador",
            host: "192.168.1.50",
            port: 9100,
            protocol: "tspl-bitmap",
            labelWidthMm: 50,
            labelLengthMm: 70,
          },
        ],
        default_printer_id: "no-existe",
        updated_at: "2026-10-11T12:00:00.000Z",
      },
      error: null,
    });

    const result = await new SupabasePrinterSettingsRepository().load();

    expect(mockFrom).toHaveBeenCalledWith("printer_settings");
    expect(result?.defaultPrinterId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result?.printers).toHaveLength(1);
  });

  it("retorna null si la fila aún no se creó", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      new SupabasePrinterSettingsRepository().load(),
    ).resolves.toBeNull();
  });

  it("rechaza la configuración remota inválida y propaga errores descriptivos", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        printers: [{ host: "invalid host" }],
        default_printer_id: null,
        updated_at: "2026-10-11T12:00:00.000Z",
      },
      error: null,
    });
    await expect(
      new SupabasePrinterSettingsRepository().load(),
    ).rejects.toThrow(/formato inválido/);

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "internal error detail" },
    });
    await expect(
      new SupabasePrinterSettingsRepository().load(),
    ).rejects.toThrow(/consultar la configuración compartida/);
  });

  it("escribe la única fila de taller con upsert parametrizado por el cliente", async () => {
    const settings = {
      printers: [],
      defaultPrinterId: null,
      updatedAt: "2026-10-11T12:00:00.000Z",
    };

    await new SupabasePrinterSettingsRepository().save(settings);

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: "workshop",
        printers: [],
        default_printer_id: null,
        updated_at: settings.updatedAt,
      },
      { onConflict: "id" },
    );
  });

  it("actualiza la configuración existente sin intentar insertar una fila", async () => {
    const settings = {
      printers: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Mostrador",
          host: "192.168.1.77",
          port: 9100,
          protocol: "tspl-bitmap" as const,
          labelWidthMm: 50,
          labelLengthMm: 70,
        },
      ],
      defaultPrinterId: "11111111-1111-4111-8111-111111111111",
      updatedAt: "2026-10-30T12:00:00.000Z",
    };
    mockUpdateMaybeSingle.mockResolvedValue({
      data: { id: "workshop" },
      error: null,
    });

    await new SupabasePrinterSettingsRepository().saveConnection(settings);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "workshop");
    expect(mockUpdateSelect).toHaveBeenCalledWith("id");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("reporta error si no existe la configuración compartida que se debe actualizar", async () => {
    mockUpdateMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      new SupabasePrinterSettingsRepository().saveConnection({
        printers: [],
        defaultPrinterId: null,
        updatedAt: "2026-10-30T12:00:00.000Z",
      }),
    ).rejects.toThrow(/actualizar la conexión compartida/);
  });
});
