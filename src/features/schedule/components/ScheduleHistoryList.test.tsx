import { describe, expect, it, jest } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";

import type { ScheduleEvent } from "../domain/events";
import { ScheduleHistoryList } from "./ScheduleHistoryList";

const mockGetByScheduleId = jest.fn<() => Promise<ScheduleEvent[]>>();

jest.mock("../../../data/local/scheduleEventDependencies", () => ({
  getDefaultScheduleEventRepository: () => ({
    getByScheduleId: () => mockGetByScheduleId(),
  }),
}));

const createdEvent: ScheduleEvent = {
  id: "event-1",
  scheduleId: "schedule-1",
  actorId: "user-1",
  actorDisplayName: "María Gómez",
  action: "created",
  changes: undefined,
  identityVerified: true,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const statusEvent: ScheduleEvent = {
  id: "event-2",
  scheduleId: "schedule-1",
  actorId: "user-2",
  actorDisplayName: "Juan Pérez",
  action: "status_manual_correction",
  changes: JSON.stringify({
    status: { before: "entregado", after: "pendiente" },
  }),
  identityVerified: false,
  createdAt: "2026-08-01T11:00:00.000Z",
  updatedAt: "2026-08-01T11:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleHistoryList", () => {
  it("muestra un mensaje si todavía no hay eventos", async () => {
    mockGetByScheduleId.mockResolvedValueOnce([]);

    const { findByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(await findByText("Todavía no hay historial.")).toBeTruthy();
  });

  it("lista los eventos con actor y acción legibles", async () => {
    mockGetByScheduleId.mockResolvedValueOnce([statusEvent, createdEvent]);

    const { findByText, getByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(await findByText("Turno creado")).toBeTruthy();
    expect(getByText("Corrección manual de estado")).toBeTruthy();
    expect(getByText(/María Gómez/)).toBeTruthy();
    expect(getByText(/Juan Pérez/)).toBeTruthy();
  });

  it("formatea el diff de status usando las etiquetas de negocio", async () => {
    mockGetByScheduleId.mockResolvedValueOnce([statusEvent]);

    const { findByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(
      await findByText("Estado: Entregado → Pendiente"),
    ).toBeTruthy();
  });

  it("formatea el diff de isPriority con etiqueta y valores legibles", async () => {
    const priorityEvent: ScheduleEvent = {
      ...statusEvent,
      id: "event-3",
      action: "updated",
      changes: JSON.stringify({ isPriority: { before: false, after: true } }),
    };
    mockGetByScheduleId.mockResolvedValueOnce([priorityEvent]);

    const { findByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(await findByText("Prioridad: No → Sí")).toBeTruthy();
  });

  it("formatea el diff de abono y de cliente sin registrar con sus etiquetas", async () => {
    const abonoEvent: ScheduleEvent = {
      ...statusEvent,
      id: "event-4",
      action: "updated",
      changes: JSON.stringify({
        abono: { before: null, after: 30000 },
        unregisteredClientName: { before: null, after: "Pedro Ramírez" },
      }),
    };
    mockGetByScheduleId.mockResolvedValueOnce([abonoEvent]);

    const { findByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(await findByText("Abono: — → 30000")).toBeTruthy();
    expect(
      await findByText("Cliente (sin registrar): — → Pedro Ramírez"),
    ).toBeTruthy();
  });

  it("marca los eventos sin verificar (PIN offline)", async () => {
    mockGetByScheduleId.mockResolvedValueOnce([statusEvent]);

    const { findByText } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );

    expect(await findByText("sin verificar")).toBeTruthy();
  });

  it("vuelve a cargar cuando cambia refreshToken", async () => {
    mockGetByScheduleId.mockResolvedValue([]);

    const { findByText, rerender } = render(
      <ScheduleHistoryList scheduleId="schedule-1" refreshToken={0} />,
    );
    await findByText("Todavía no hay historial.");
    const callsBeforeRefresh = mockGetByScheduleId.mock.calls.length;

    mockGetByScheduleId.mockResolvedValue([createdEvent]);
    rerender(<ScheduleHistoryList scheduleId="schedule-1" refreshToken={1} />);

    await waitFor(() =>
      expect(mockGetByScheduleId.mock.calls.length).toBeGreaterThan(
        callsBeforeRefresh,
      ),
    );
    expect(await findByText("Turno creado")).toBeTruthy();
  });
});
