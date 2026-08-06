import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import type { Schedule } from "../domain/types";
import { ScheduleQuickActionSheet } from "./ScheduleQuickActionSheet";

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  date: "2026-08-15",
  time: "14:30",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleQuickActionSheet", () => {
  it("no renderiza nada si no hay turno", () => {
    const { queryByText } = render(
      <ScheduleQuickActionSheet
        visible={false}
        schedule={null}
        clientLabel=""
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(queryByText("Ver turno completo")).toBeNull();
  });

  it("muestra el nombre del cliente y el estado actual", () => {
    const { getByText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={baseSchedule}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("Estado actual: Agendado")).toBeTruthy();
  });

  it("muestra ambas acciones cuando el turno todavía no está listo ni entregado", () => {
    const { getByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={baseSchedule}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByLabelText("Marcar listo para entregar")).toBeTruthy();
    expect(getByLabelText("Marcar entregado")).toBeTruthy();
  });

  it("solo muestra 'Marcar entregado' cuando ya está listo para entregar", () => {
    const { getByLabelText, queryByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={{ ...baseSchedule, status: "listo_para_entregar" }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
    expect(getByLabelText("Marcar entregado")).toBeTruthy();
  });

  it("no muestra ninguna acción de estado cuando ya está entregado", () => {
    const { queryByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={{ ...baseSchedule, status: "entregado" }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
    expect(queryByLabelText("Marcar entregado")).toBeNull();
  });

  it("llama a los callbacks correctos al presionar cada botón", () => {
    const onMarkReady = jest.fn();
    const onMarkDelivered = jest.fn();
    const onViewDetail = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={baseSchedule}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={onMarkReady}
        onMarkDelivered={onMarkDelivered}
        onViewDetail={onViewDetail}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByLabelText("Marcar listo para entregar"));
    expect(onMarkReady).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Marcar entregado"));
    expect(onMarkDelivered).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Ver turno completo"));
    expect(onViewDetail).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("deshabilita las acciones mientras isProcessing es true", () => {
    const { getByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={baseSchedule}
        clientLabel="Ana Torres"
        isProcessing
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const readyButton = getByLabelText("Marcar listo para entregar");
    expect(
      readyButton.props.accessibilityState?.disabled ?? readyButton.props.disabled,
    ).toBe(true);
    const deliveredButton = getByLabelText("Marcar entregado");
    expect(
      deliveredButton.props.accessibilityState?.disabled ??
        deliveredButton.props.disabled,
    ).toBe(true);
  });

  it("muestra el mensaje de error cuando se provee", () => {
    const { getByText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={baseSchedule}
        clientLabel="Ana Torres"
        isProcessing={false}
        error="No se pudo actualizar el turno. Intenta nuevamente."
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      getByText("No se pudo actualizar el turno. Intenta nuevamente."),
    ).toBeTruthy();
  });
});
