import { describe, expect, it } from "@jest/globals";

import { clientFactory } from "../../../__tests__/factories";
import type { Schedule, ScheduleStatus } from "../../schedule/domain/types";
import {
  buildReminderItems,
  classifyReadySchedule,
  splitOverdueAndUpcoming,
} from "./overdueSchedules";

const TODAY = "2026-08-30";

function makeSchedule(overrides: Partial<Schedule> & { id: string }): Schedule {
  return {
    isPriority: false,
    isOwnerFlagged: false,
    category: "arreglo",
    status: "listo_para_entregar",
    statusLocked: false,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

/** `readyAt` que, al mediodía local, queda a `daysAgo` días de TODAY. */
function readyAtDaysAgo(daysAgo: number): string {
  const [year, month, day] = TODAY.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

describe("classifyReadySchedule", () => {
  it("14 días: no clasifica (null)", () => {
    const schedule = makeSchedule({ id: "s-1", readyAt: readyAtDaysAgo(14) });
    expect(classifyReadySchedule(schedule, TODAY)).toBeNull();
  });

  it("15 días: 'por_vencer'", () => {
    const schedule = makeSchedule({ id: "s-1", readyAt: readyAtDaysAgo(15) });
    expect(classifyReadySchedule(schedule, TODAY)).toBe("por_vencer");
  });

  it("29 días: 'por_vencer'", () => {
    const schedule = makeSchedule({ id: "s-1", readyAt: readyAtDaysAgo(29) });
    expect(classifyReadySchedule(schedule, TODAY)).toBe("por_vencer");
  });

  it("30 días: 'vencido'", () => {
    const schedule = makeSchedule({ id: "s-1", readyAt: readyAtDaysAgo(30) });
    expect(classifyReadySchedule(schedule, TODAY)).toBe("vencido");
  });

  it.each<ScheduleStatus>([
    "pendiente",
    "agendado",
    "en_proceso",
    "entregado",
  ])("status '%s' nunca clasifica, aunque tenga readyAt viejo", (status) => {
    const schedule = makeSchedule({
      id: "s-1",
      status,
      readyAt: readyAtDaysAgo(60),
    });
    expect(classifyReadySchedule(schedule, TODAY)).toBeNull();
  });

  it("sin readyAt no clasifica aunque el status sea 'listo_para_entregar'", () => {
    const schedule = makeSchedule({ id: "s-1", readyAt: undefined });
    expect(classifyReadySchedule(schedule, TODAY)).toBeNull();
  });
});

describe("splitOverdueAndUpcoming", () => {
  it("separa vencidos y por vencer del universo global de turnos", () => {
    const schedules = [
      makeSchedule({ id: "s-overdue", readyAt: readyAtDaysAgo(30) }),
      makeSchedule({ id: "s-upcoming", readyAt: readyAtDaysAgo(20) }),
      makeSchedule({ id: "s-fresh", readyAt: readyAtDaysAgo(1) }),
      makeSchedule({
        id: "s-delivered",
        status: "entregado",
        readyAt: readyAtDaysAgo(60),
      }),
    ];

    const result = splitOverdueAndUpcoming(schedules, TODAY);

    expect(result.overdue.map((s) => s.id)).toEqual(["s-overdue"]);
    expect(result.upcoming.map((s) => s.id)).toEqual(["s-upcoming"]);
  });
});

describe("buildReminderItems", () => {
  it("ordena descendentemente por días esperando (más urgente primero)", () => {
    const client = clientFactory({
      id: "client-1",
      firstName: "Ana",
      lastName: "Torres",
    });
    const clientsById = new Map([[client.id, client]]);
    const schedules = [
      makeSchedule({
        id: "s-15",
        clientId: "client-1",
        readyAt: readyAtDaysAgo(15),
      }),
      makeSchedule({
        id: "s-45",
        unregisteredClientName: "Pedro",
        readyAt: readyAtDaysAgo(45),
      }),
      makeSchedule({
        id: "s-30",
        clientId: "client-1",
        readyAt: readyAtDaysAgo(30),
      }),
    ];

    const result = buildReminderItems(schedules, clientsById, TODAY);

    expect(result.map((item) => item.schedule.id)).toEqual([
      "s-45",
      "s-30",
      "s-15",
    ]);
    expect(result[0]!.clientLabel).toBe("Pedro");
    expect(result[0]!.severity).toBe("vencido");
    expect(result[2]!.severity).toBe("por_vencer");
  });
});
