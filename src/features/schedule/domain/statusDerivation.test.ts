import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  deriveScheduleStatus,
  describeManualCorrectionSideEffects,
  getManualCorrectionBlockReason,
  isStickyStatus,
  resolveManualCorrectionFields,
} from "./statusDerivation";

describe("deriveScheduleStatus", () => {
  it("retorna 'pendiente' sin fecha ni operario", () => {
    expect(deriveScheduleStatus({})).toBe("pendiente");
  });

  it("retorna 'agendado' con fecha y sin operario", () => {
    expect(deriveScheduleStatus({ date: "2026-08-10" })).toBe("agendado");
  });

  it("retorna 'en_proceso' con operario y sin fecha", () => {
    expect(deriveScheduleStatus({ operarioId: "op-1" })).toBe("en_proceso");
  });

  it("retorna 'en_proceso' con fecha Y operario (operario gana)", () => {
    expect(
      deriveScheduleStatus({ date: "2026-08-10", operarioId: "op-1" }),
    ).toBe("en_proceso");
  });
});

describe("isStickyStatus", () => {
  it("no es pegajoso: pendiente, agendado, en_proceso", () => {
    expect(isStickyStatus("pendiente")).toBe(false);
    expect(isStickyStatus("agendado")).toBe(false);
    expect(isStickyStatus("en_proceso")).toBe(false);
  });

  it("es pegajoso: listo_para_entregar, entregado", () => {
    expect(isStickyStatus("listo_para_entregar")).toBe(true);
    expect(isStickyStatus("entregado")).toBe(true);
  });
});

describe("getManualCorrectionBlockReason", () => {
  it("nunca bloquea 'pendiente'", () => {
    expect(getManualCorrectionBlockReason({}, "pendiente")).toBeNull();
    expect(
      getManualCorrectionBlockReason(
        { date: "2026-08-10", operarioId: "op-1" },
        "pendiente",
      ),
    ).toBeNull();
  });

  it("bloquea 'agendado' sin fecha", () => {
    expect(getManualCorrectionBlockReason({}, "agendado")).toBe(
      'Asigna una fecha antes de corregir el turno a "Agendado".',
    );
  });

  it("no bloquea 'agendado' con fecha presente", () => {
    expect(
      getManualCorrectionBlockReason({ date: "2026-08-10" }, "agendado"),
    ).toBeNull();
  });

  it("bloquea 'en_proceso'/'listo_para_entregar'/'entregado' sin operario", () => {
    expect(getManualCorrectionBlockReason({}, "en_proceso")).toBe(
      'Asigna un operario antes de corregir el turno a "En proceso".',
    );
    expect(getManualCorrectionBlockReason({}, "listo_para_entregar")).toBe(
      'Asigna un operario antes de corregir el turno a "Listo para entregar".',
    );
    expect(getManualCorrectionBlockReason({}, "entregado")).toBe(
      'Asigna un operario antes de corregir el turno a "Entregado".',
    );
  });

  it("no bloquea 'en_proceso'/'listo_para_entregar'/'entregado' con operario presente", () => {
    const current = { operarioId: "op-1" };
    expect(getManualCorrectionBlockReason(current, "en_proceso")).toBeNull();
    expect(
      getManualCorrectionBlockReason(current, "listo_para_entregar"),
    ).toBeNull();
    expect(getManualCorrectionBlockReason(current, "entregado")).toBeNull();
  });
});

describe("resolveManualCorrectionFields", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-01T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("'pendiente' limpia date, operarioId, isPriority, readyAt y deliveredAt", () => {
    const current = {
      date: "2026-08-10",
      operarioId: "op-1",
      isPriority: true,
      readyAt: "2026-07-01T00:00:00.000Z",
      deliveredAt: "2026-07-02T00:00:00.000Z",
    };
    expect(resolveManualCorrectionFields(current, "pendiente")).toEqual({
      date: undefined,
      operarioId: undefined,
      isPriority: false,
      readyAt: undefined,
      deliveredAt: undefined,
    });
  });

  it("'agendado' limpia operarioId, readyAt y deliveredAt (no toca date)", () => {
    const current = {
      date: "2026-08-10",
      operarioId: "op-1",
      isPriority: false,
      readyAt: "2026-07-01T00:00:00.000Z",
      deliveredAt: "2026-07-02T00:00:00.000Z",
    };
    expect(resolveManualCorrectionFields(current, "agendado")).toEqual({
      operarioId: undefined,
      readyAt: undefined,
      deliveredAt: undefined,
    });
  });

  it("'en_proceso' limpia readyAt y deliveredAt", () => {
    const current = {
      operarioId: "op-1",
      isPriority: false,
      readyAt: "2026-07-01T00:00:00.000Z",
      deliveredAt: "2026-07-02T00:00:00.000Z",
    };
    expect(resolveManualCorrectionFields(current, "en_proceso")).toEqual({
      readyAt: undefined,
      deliveredAt: undefined,
    });
  });

  it("'listo_para_entregar' limpia deliveredAt y estampa readyAt si faltaba", () => {
    const current = { operarioId: "op-1", isPriority: false };
    expect(
      resolveManualCorrectionFields(current, "listo_para_entregar"),
    ).toEqual({
      deliveredAt: undefined,
      readyAt: "2026-08-01T10:00:00.000Z",
    });
  });

  it("'listo_para_entregar' NO pisa un readyAt ya existente", () => {
    const current = {
      operarioId: "op-1",
      isPriority: false,
      readyAt: "2026-07-01T00:00:00.000Z",
    };
    expect(
      resolveManualCorrectionFields(current, "listo_para_entregar"),
    ).toEqual({
      deliveredAt: undefined,
      readyAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("'entregado' estampa deliveredAt si faltaba, sin tocar readyAt", () => {
    const current = { operarioId: "op-1", isPriority: false };
    expect(resolveManualCorrectionFields(current, "entregado")).toEqual({
      deliveredAt: "2026-08-01T10:00:00.000Z",
    });
  });

  it("'entregado' NO pisa un deliveredAt ya existente", () => {
    const current = {
      operarioId: "op-1",
      isPriority: false,
      deliveredAt: "2026-07-02T00:00:00.000Z",
    };
    expect(resolveManualCorrectionFields(current, "entregado")).toEqual({
      deliveredAt: "2026-07-02T00:00:00.000Z",
    });
  });
});

describe("describeManualCorrectionSideEffects", () => {
  it("retorna [] cuando no hay campos visibles que limpiar", () => {
    expect(
      describeManualCorrectionSideEffects({ isPriority: false }, "pendiente"),
    ).toEqual([]);
  });

  it("retorna solo 'la fecha' si únicamente hay fecha presente", () => {
    expect(
      describeManualCorrectionSideEffects(
        { date: "2026-08-10", isPriority: false },
        "pendiente",
      ),
    ).toEqual(["la fecha"]);
  });

  it("retorna solo 'el operario asignado' si únicamente hay operario presente", () => {
    expect(
      describeManualCorrectionSideEffects(
        { operarioId: "op-1", isPriority: false },
        "agendado",
      ),
    ).toEqual(["el operario asignado"]);
  });

  it("retorna ambas frases si corregir a 'pendiente' limpia fecha y operario", () => {
    expect(
      describeManualCorrectionSideEffects(
        { date: "2026-08-10", operarioId: "op-1", isPriority: false },
        "pendiente",
      ),
    ).toEqual(["la fecha", "el operario asignado"]);
  });

  it("no incluye ninguna frase para readyAt/deliveredAt aunque se limpien", () => {
    const effects = describeManualCorrectionSideEffects(
      {
        operarioId: "op-1",
        isPriority: false,
        readyAt: "2026-07-01T00:00:00.000Z",
        deliveredAt: "2026-07-02T00:00:00.000Z",
      },
      "en_proceso",
    );
    expect(effects).toEqual([]);
  });
});
