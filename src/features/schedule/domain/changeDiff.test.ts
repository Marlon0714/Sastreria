import { describe, expect, it } from "@jest/globals";

import { diffScheduleFields } from "./changeDiff";

describe("diffScheduleFields", () => {
  it("retorna vacío si no hay cambios", () => {
    const schedule = { clientId: "c-1", date: "2026-08-10" };

    expect(diffScheduleFields(schedule, schedule)).toEqual({});
  });

  it("detecta solo los campos que cambiaron", () => {
    const before = { clientId: "c-1", date: "2026-08-10", price: 50000 };
    const after = { clientId: "c-1", date: "2026-08-11", price: 50000 };

    expect(diffScheduleFields(before, after)).toEqual({
      date: { before: "2026-08-10", after: "2026-08-11" },
    });
  });

  it("trata undefined como null para no marcar falsos cambios", () => {
    const before = { notes: undefined };
    const after = { notes: null };

    expect(diffScheduleFields(before, after)).toEqual({});
  });

  it("en un create (before vacío), cada campo definido queda como cambio desde null", () => {
    const after = { clientId: "c-1", operarioId: "op-1" };

    expect(diffScheduleFields({}, after)).toEqual({
      clientId: { before: null, after: "c-1" },
      operarioId: { before: null, after: "op-1" },
    });
  });

  it("detecta cambios en el abono", () => {
    const before = { clientId: "c-1", price: 100000, abono: 30000 };
    const after = { clientId: "c-1", price: 100000, abono: 50000 };

    expect(diffScheduleFields(before, after)).toEqual({
      abono: { before: 30000, after: 50000 },
    });
  });

  it("detecta cambios en el nombre de cliente sin registrar", () => {
    const before = { unregisteredClientName: "Pedro" };
    const after = { unregisteredClientName: "Pedro Ramírez" };

    expect(diffScheduleFields(before, after)).toEqual({
      unregisteredClientName: { before: "Pedro", after: "Pedro Ramírez" },
    });
  });

  it("detecta cambios en startDate y dueDate", () => {
    const before = { startDate: "2026-09-01", dueDate: "2026-09-10" };
    const after = { startDate: "2026-09-02", dueDate: "2026-09-10" };

    expect(diffScheduleFields(before, after)).toEqual({
      startDate: { before: "2026-09-01", after: "2026-09-02" },
    });
  });

  // No hay test runtime para "status" porque ScheduleDiffableField ni
  // siquiera lo admite como clave — el compilador ya lo garantiza.
});
