import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { Schedule } from "../domain/types";
import { ScheduleQuickActionSheet } from "./ScheduleQuickActionSheet";

jest.mock("../../../data/local/profilesCacheDependencies", () => ({
  getDefaultProfilesCacheRepository: () => ({
    getOperarios: jest.fn(async () => Promise.resolve([])),
  }),
}));

const noopSaveInlinePrice = jest.fn<
  (price: number) => Promise<Schedule | null>
>(async () => Promise.resolve(null));

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  operarioId: "operario-1",
  date: "2026-08-15",
  time: "14:30",
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleQuickActionSheet", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
    expect(getByLabelText("Marcar entregado")).toBeTruthy();
  });

  it("no ofrece 'Marcar listo' ni 'Marcar entregado' sin operario asignado, y explica por qué", () => {
    const { queryByLabelText, getByText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={{ ...baseSchedule, operarioId: undefined }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={jest.fn()}
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
    expect(queryByLabelText("Marcar entregado")).toBeNull();
    expect(
      getByText(
        "Asigna un operario para poder marcar el turno como listo o entregado.",
      ),
    ).toBeTruthy();
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
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
        // Precio ya cargado y saldado (price === abono): sin esto, "Marcar
        // entregado" abre la tarjeta inline de precio en vez de llamar
        // directo al callback, que es justo lo que este test verifica para
        // cada botón (ver casos dedicados de missingPrice/saldo más abajo).
        schedule={{ ...baseSchedule, price: 100000, abono: 100000 }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={onMarkReady}
        onMarkDelivered={onMarkDelivered}
        onAssignOperario={jest.fn()}
        onViewDetail={onViewDetail}
        onClose={onClose}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    fireEvent.press(getByLabelText("Marcar listo para entregar"));
    expect(onMarkReady).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Marcar entregado"));
    expect(onMarkDelivered).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Ver turno completo"));
    expect(onViewDetail).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Cerrar"));
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    const readyButton = getByLabelText("Marcar listo para entregar");
    expect(
      readyButton.props.accessibilityState?.disabled ??
        readyButton.props.disabled,
    ).toBe(true);
    const deliveredButton = getByLabelText("Marcar entregado");
    expect(
      deliveredButton.props.accessibilityState?.disabled ??
        deliveredButton.props.disabled,
    ).toBe(true);
  });

  it("al marcar entregado con saldo pendiente, pide confirmación indicando el monto", () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const onMarkDelivered = jest.fn();

    const { getByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={{ ...baseSchedule, price: 100000, abono: 30000 }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={onMarkDelivered}
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    fireEvent.press(getByLabelText("Marcar entregado"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Saldo pendiente",
      expect.stringContaining("$70.000"),
      expect.anything(),
    );
    expect(onMarkDelivered).not.toHaveBeenCalled();
  });

  it("al marcar entregado sin saldo pendiente, marca directo sin pedir confirmación", () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const onMarkDelivered = jest.fn();

    const { getByLabelText } = render(
      <ScheduleQuickActionSheet
        visible
        schedule={{ ...baseSchedule, price: 100000, abono: 100000 }}
        clientLabel="Ana Torres"
        isProcessing={false}
        error={null}
        onMarkReady={jest.fn()}
        onMarkDelivered={onMarkDelivered}
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    fireEvent.press(getByLabelText("Marcar entregado"));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(onMarkDelivered).toHaveBeenCalledTimes(1);
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
        onAssignOperario={jest.fn()}
        onViewDetail={jest.fn()}
        onClose={jest.fn()}
        canToggleOwnerFlag={false}
        isTogglingOwnerFlag={false}
        onToggleOwnerFlag={jest.fn()}
        onSaveInlinePrice={noopSaveInlinePrice}
      />,
    );

    expect(
      getByText("No se pudo actualizar el turno. Intenta nuevamente."),
    ).toBeTruthy();
  });

  describe("marca del dueño (isOwnerFlagged)", () => {
    it("canToggleOwnerFlag=true muestra el switch con el valor de schedule.isOwnerFlagged y dispara onToggleOwnerFlag al tocarlo", () => {
      const onToggleOwnerFlag = jest.fn();

      const { getByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={{ ...baseSchedule, isOwnerFlagged: true }}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={jest.fn()}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={onToggleOwnerFlag}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      const toggle = getByLabelText("Personal");
      expect(toggle.props.value).toBe(true);
      fireEvent(toggle, "valueChange", false);
      expect(onToggleOwnerFlag).toHaveBeenCalledTimes(1);
    });

    it("canToggleOwnerFlag=false no renderiza el switch ni deja ningún accessibilityLabel relacionado en el árbol", () => {
      const { queryByLabelText, queryByText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={{ ...baseSchedule, isOwnerFlagged: true }}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={jest.fn()}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      expect(queryByLabelText("Personal")).toBeNull();
      expect(queryByText(/Personal/)).toBeNull();
    });
  });

  describe("precio inline al entregar (N-125)", () => {
    it("al marcar entregado sin precio, ya no abre un Alert: muestra la tarjeta inline con las 3 opciones", async () => {
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation(() => undefined);
      const onMarkDelivered = jest.fn();
      const onViewDetail = jest.fn();

      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule} // price undefined
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={onMarkDelivered}
          onAssignOperario={jest.fn()}
          onViewDetail={onViewDetail}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));

      expect(alertSpy).not.toHaveBeenCalled();
      expect(
        await findByLabelText("Precio para entregar"),
      ).toBeTruthy();
      expect(getByLabelText("Guardar y entregar")).toBeTruthy();
      expect(getByLabelText("Entregar sin precio")).toBeTruthy();
      expect(getByLabelText("Completar en el turno completo")).toBeTruthy();
    });

    it("con precio en 0, la tarjeta inline también se abre (0 se trata igual que sin precio)", async () => {
      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={{ ...baseSchedule, price: 0, abono: 0 }}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={jest.fn()}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));

      expect(await findByLabelText("Precio para entregar")).toBeTruthy();
    });

    it("(a) precio inválido (vacío o '0') muestra priceInputError y no llama a onSaveInlinePrice", async () => {
      const onSaveInlinePrice = jest.fn<
        (price: number) => Promise<Schedule | null>
      >(async () => Promise.resolve(null));

      const { getByLabelText, findByLabelText, findByText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={jest.fn()}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={onSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");

      // Vacío (nunca se escribió nada).
      fireEvent.press(getByLabelText("Guardar y entregar"));
      expect(
        await findByText("Ingresa un precio válido para continuar."),
      ).toBeTruthy();
      expect(onSaveInlinePrice).not.toHaveBeenCalled();

      // "0" tampoco es válido.
      fireEvent.changeText(getByLabelText("Precio para entregar"), "0");
      fireEvent.press(getByLabelText("Guardar y entregar"));
      expect(
        await findByText("Ingresa un precio válido para continuar."),
      ).toBeTruthy();
      expect(onSaveInlinePrice).not.toHaveBeenCalled();
    });

    it("(b) precio válido llama a onSaveInlinePrice y, si deja saldo pendiente, encadena el Alert sin llamar onMarkDelivered directo", async () => {
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation(() => undefined);
      const onMarkDelivered = jest.fn();
      const onSaveInlinePrice = jest.fn<
        (price: number) => Promise<Schedule | null>
      >(async () => Promise.resolve({ ...baseSchedule, price: 100000 }));

      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={onMarkDelivered}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={onSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");
      fireEvent.changeText(getByLabelText("Precio para entregar"), "100000");
      fireEvent.press(getByLabelText("Guardar y entregar"));

      await findByLabelText("Marcar entregado"); // la tarjeta se colapsó

      expect(onSaveInlinePrice).toHaveBeenCalledWith(100000);
      expect(alertSpy).toHaveBeenCalledWith(
        "Saldo pendiente",
        expect.any(String),
        expect.anything(),
      );
      expect(onMarkDelivered).not.toHaveBeenCalled();
    });

    it("(c) si el precio guardado deja saldo $0, llama onMarkDelivered directo sin Alert", async () => {
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation(() => undefined);
      const onMarkDelivered = jest.fn();
      const onSaveInlinePrice = jest.fn<
        (price: number) => Promise<Schedule | null>
      >(async () =>
        Promise.resolve({ ...baseSchedule, price: 50000, abono: 50000 }),
      );

      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={onMarkDelivered}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={onSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");
      fireEvent.changeText(getByLabelText("Precio para entregar"), "50000");
      fireEvent.press(getByLabelText("Guardar y entregar"));

      await findByLabelText("Marcar entregado");

      expect(alertSpy).not.toHaveBeenCalled();
      expect(onMarkDelivered).toHaveBeenCalledTimes(1);
    });

    it("(d) si onSaveInlinePrice resuelve null, la tarjeta sigue abierta y no se llama onMarkDelivered", async () => {
      const onMarkDelivered = jest.fn();
      const onSaveInlinePrice = jest.fn<
        (price: number) => Promise<Schedule | null>
      >(async () => Promise.resolve(null));

      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={onMarkDelivered}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={onSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");
      fireEvent.changeText(getByLabelText("Precio para entregar"), "50000");
      fireEvent.press(getByLabelText("Guardar y entregar"));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSaveInlinePrice).toHaveBeenCalledWith(50000);
      expect(onMarkDelivered).not.toHaveBeenCalled();
      expect(getByLabelText("Precio para entregar")).toBeTruthy();
    });

    it("(e) 'Entregar sin precio' marca directo (0 no deja saldo pendiente) y 'Completar en el turno completo' navega, sin usar Alert", async () => {
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation(() => undefined);
      const onMarkDelivered = jest.fn();
      const onViewDetail = jest.fn();

      const { getByLabelText, findByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={{ ...baseSchedule, price: 0, abono: 0 }}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={onMarkDelivered}
          onAssignOperario={jest.fn()}
          onViewDetail={onViewDetail}
          onClose={jest.fn()}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");

      fireEvent.press(getByLabelText("Entregar sin precio"));
      expect(onMarkDelivered).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();

      fireEvent.press(getByLabelText("Completar en el turno completo"));
      expect(onViewDetail).toHaveBeenCalledTimes(1);
    });

    it("el botón 'Cancelar' propio de la tarjeta la colapsa sin cerrar el panel completo", async () => {
      const onClose = jest.fn();

      const { getByLabelText, findByLabelText, queryByLabelText } = render(
        <ScheduleQuickActionSheet
          visible
          schedule={baseSchedule}
          clientLabel="Ana Torres"
          isProcessing={false}
          error={null}
          onMarkReady={jest.fn()}
          onMarkDelivered={jest.fn()}
          onAssignOperario={jest.fn()}
          onViewDetail={jest.fn()}
          onClose={onClose}
          canToggleOwnerFlag={false}
          isTogglingOwnerFlag={false}
          onToggleOwnerFlag={jest.fn()}
          onSaveInlinePrice={noopSaveInlinePrice}
        />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));
      await findByLabelText("Precio para entregar");

      fireEvent.press(getByLabelText("Cancelar"));

      expect(queryByLabelText("Precio para entregar")).toBeNull();
      expect(getByLabelText("Marcar entregado")).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
