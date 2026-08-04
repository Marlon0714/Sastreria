import { describe, expect, it } from "@jest/globals";

import { deriveScheduleStatus, isStickyStatus } from "./statusDerivation";

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
