import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import type React from "react";

import type { Schedule } from "../domain/types";
import ScheduleFormScreen from "./ScheduleFormScreen";

interface UseScheduleFormResult {
  schedule: Schedule | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submit: (values: unknown) => Promise<Schedule | null>;
  syncScheduleSnapshot: (updated: Schedule) => void;
}

interface UseDeleteScheduleResult {
  isDeleting: boolean;
  error: string | null;
  deleteSchedule: (id: string) => Promise<boolean>;
}

const mockUseScheduleForm = jest.fn<(scheduleId?: string) => UseScheduleFormResult>();
const mockUseDeleteSchedule = jest.fn<() => UseDeleteScheduleResult>();

jest.mock("../hooks/useScheduleForm", () => ({
  useScheduleForm: (scheduleId?: string) => mockUseScheduleForm(scheduleId),
}));

jest.mock("../hooks/useDeleteSchedule", () => ({
  useDeleteSchedule: () => mockUseDeleteSchedule(),
}));

interface UseScheduleStatusActionsResult {
  isProcessing: boolean;
  error: string | null;
  markReady: () => Promise<Schedule | null>;
  markDelivered: () => Promise<Schedule | null>;
  applyCorrection: (newStatus: Schedule["status"]) => Promise<Schedule | null>;
}

const mockUseScheduleStatusActions =
  jest.fn<() => UseScheduleStatusActionsResult>();

jest.mock("../hooks/useScheduleStatusActions", () => ({
  useScheduleStatusActions: () => mockUseScheduleStatusActions(),
}));

jest.mock("../components/ClientPickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Text, TextInput, View } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    ClientPickerField: ({
      clientId,
      unregisteredName,
      onChangeClientId,
      onChangeUnregisteredName,
      errorMessage,
    }: {
      clientId?: string;
      unregisteredName?: string;
      onChangeClientId: (id: string | undefined) => void;
      onChangeUnregisteredName: (name: string | undefined) => void;
      errorMessage?: string;
    }) =>
      ReactModule.createElement(View, null, [
        ReactModule.createElement(TextInput, {
          key: "clientId",
          accessibilityLabel: "Cliente",
          value: clientId ?? "",
          onChangeText: (text: string) =>
            onChangeClientId(text === "" ? undefined : text),
        }),
        ReactModule.createElement(TextInput, {
          key: "unregisteredName",
          accessibilityLabel: "Nombre del cliente",
          value: unregisteredName ?? "",
          onChangeText: (text: string) =>
            onChangeUnregisteredName(text === "" ? undefined : text),
        }),
        errorMessage
          ? ReactModule.createElement(Text, { key: "error" }, errorMessage)
          : null,
      ]),
  };
});

jest.mock("../components/OperarioPickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { TextInput } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    OperarioPickerField: ({
      value,
      onChange,
    }: {
      value?: string;
      onChange: (id: string | undefined) => void;
    }) =>
      ReactModule.createElement(TextInput, {
        accessibilityLabel: "Operario",
        value: value ?? "",
        onChangeText: (text: string) => onChange(text === "" ? undefined : text),
      }),
  };
});

jest.mock("../components/ScheduleDateTimePickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { TextInput } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    ScheduleDateTimePickerField: ({
      value,
      onChange,
      accessibilityLabel,
    }: {
      value?: string;
      onChange: (value: string | undefined) => void;
      accessibilityLabel: string;
    }) =>
      ReactModule.createElement(TextInput, {
        accessibilityLabel,
        value: value ?? "",
        onChangeText: (text: string) => onChange(text === "" ? undefined : text),
      }),
  };
});

jest.mock("../components/ScheduleHistoryList", () => ({
  ScheduleHistoryList: () => null,
}));

type ScreenProps = React.ComponentProps<typeof ScheduleFormScreen>;

function buildProps(
  navigate: jest.Mock,
  goBack: jest.Mock,
  scheduleId?: string,
  category?: "arreglo" | "confeccion",
): ScreenProps {
  return {
    navigation: { navigate, goBack } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleForm-test",
      name: "ScheduleForm",
      params: { scheduleId, category },
    } as unknown as ScreenProps["route"],
  };
}

const schedule: Schedule = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  clientId: "22222222-2222-4222-8222-222222222222",
  notes: "Ajuste de traje",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleFormScreen", () => {
  beforeEach(() => {
    mockUseScheduleForm.mockReset();
    mockUseDeleteSchedule.mockReset();
    mockUseDeleteSchedule.mockReturnValue({
      isDeleting: false,
      error: null,
      deleteSchedule: jest.fn(async () => Promise.resolve(true)),
    });
    mockUseScheduleStatusActions.mockReturnValue({
      isProcessing: false,
      error: null,
      markReady: jest.fn(async () => Promise.resolve(null)),
      markDelivered: jest.fn(async () => Promise.resolve(null)),
      applyCorrection: jest.fn(async () => Promise.resolve(null)),
    });
  });

  it("renders create mode without a delete button", () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText, queryByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(getByLabelText("Guardar turno")).toBeTruthy();
    expect(queryByLabelText("Eliminar turno")).toBeNull();
  });

  it("shows a loading view while loading an existing schedule", () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: true,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(null)),
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), jest.fn(), schedule.id)}
      />,
    );

    expect(getByText("Cargando turno...")).toBeTruthy();
  });

  it("submits valid values (fecha/hora opcionales) y navega hacia atrás", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });
    const goBack = jest.fn();

    const { getByPlaceholderText, getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), goBack)} />,
    );

    fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");
    fireEvent(getByLabelText("Con hora específica"), "valueChange", true);
    fireEvent.changeText(getByLabelText("Hora"), "14:30");
    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "50000");
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          date: "2026-08-10",
          time: "14:30",
          clientId: schedule.clientId,
          price: 50000,
        }),
      );
    });
    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });
  });

  it("preselecciona la categoría del segmento activo y permite cambiarla antes de guardar", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });
    const goBack = jest.fn();

    const { getByLabelText, getByText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), goBack, undefined, "confeccion")}
      />,
    );

    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);

    fireEvent.press(getByLabelText("Guardar turno"));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ category: "confeccion" }),
      );
    });

    fireEvent.press(getByText("✂️ Arreglo"));
    fireEvent.press(getByLabelText("Guardar turno"));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ category: "arreglo" }),
      );
    });
  });

  it("el checkbox 'Prioritario' solo se ofrece con fecha, y se limpia si se quita", () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(null)),
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText, queryByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(queryByLabelText("Prioritario")).toBeNull();

    fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");

    expect(getByLabelText("Prioritario")).toBeTruthy();

    fireEvent.changeText(getByLabelText("Fecha"), "");

    expect(queryByLabelText("Prioritario")).toBeNull();
  });

  it("envía isPriority=true si se marca el checkbox con fecha", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");
    fireEvent(getByLabelText("Prioritario"), "valueChange", true);
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ isPriority: true, date: "2026-08-10" }),
      );
    });
  });

  it("permite guardar sin fecha/hora, pero exige cliente", async () => {
    const submit = jest.fn(async () => Promise.resolve(null));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText, findByText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Guardar turno"));

    expect(
      await findByText("Elige un cliente o escribe un nombre, no ambos ni ninguno"),
    ).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it("permite guardar un turno sin registrar cliente, solo con el nombre", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Nombre del cliente"), "Pedro Ramírez");
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: undefined,
          unregisteredClientName: "Pedro Ramírez",
        }),
      );
    });
  });

  it("pre-fills fields, muestra el estado y el botón de eliminar en modo edición", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText, getByDisplayValue, getByText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), jest.fn(), schedule.id)}
      />,
    );

    await waitFor(() => {
      expect(getByDisplayValue("2026-08-10")).toBeTruthy();
    });
    expect(getByDisplayValue("14:30")).toBeTruthy();
    expect(getByText("Estado: Agendado")).toBeTruthy();
    expect(getByLabelText("Eliminar turno")).toBeTruthy();
  });

  it("muestra 'no encontrado' en vez del formulario si el turno ya no existe", () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: "No se pudo cargar el turno.",
      submit: jest.fn(async () => Promise.resolve(null)),
      syncScheduleSnapshot: jest.fn(),
    });
    const goBack = jest.fn();

    const { getByText, queryByLabelText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), goBack, "id-inexistente")}
      />,
    );

    expect(
      getByText("Este turno ya no existe o no se pudo cargar."),
    ).toBeTruthy();
    expect(queryByLabelText("Eliminar turno")).toBeNull();
    expect(queryByLabelText("Guardar turno")).toBeNull();

    fireEvent.press(getByText("Volver"));
    expect(goBack).toHaveBeenCalled();
  });

  it("deletes the schedule after confirming and navigates back", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
      syncScheduleSnapshot: jest.fn(),
    });
    const deleteSchedule = jest.fn(async () => Promise.resolve(true));
    mockUseDeleteSchedule.mockReturnValue({
      isDeleting: false,
      error: null,
      deleteSchedule,
    });
    const goBack = jest.fn();

    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b) => b.text === "Eliminar");
      void confirm?.onPress?.();
    });

    const { getByLabelText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), goBack, schedule.id)}
      />,
    );

    fireEvent.press(getByLabelText("Eliminar turno"));

    await waitFor(() => {
      expect(deleteSchedule).toHaveBeenCalledWith(schedule.id);
    });
    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });
  });

  describe("acciones de estado manual", () => {
    it("muestra ambos botones cuando el turno está en un estado no terminal", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "agendado", operarioId: "op-1" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      expect(getByLabelText("Marcar listo para entregar")).toBeTruthy();
      expect(getByLabelText("Marcar entregado")).toBeTruthy();
    });

    it("no ofrece 'Marcar listo' ni 'Marcar entregado' sin operario asignado, y explica por qué", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "agendado", operarioId: undefined },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { queryByLabelText, getByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
      expect(queryByLabelText("Marcar entregado")).toBeNull();
      expect(
        getByText(
          "Asigna un operario para poder marcar el turno como listo o entregado.",
        ),
      ).toBeTruthy();
    });

    it("deshabilita Guardar y Eliminar mientras una acción de estado está en curso, para no pisar cambios entre sí", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "agendado" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });
      mockUseScheduleStatusActions.mockReturnValue({
        isProcessing: true,
        error: null,
        markReady: jest.fn(async () => Promise.resolve(null)),
        markDelivered: jest.fn(async () => Promise.resolve(null)),
        applyCorrection: jest.fn(async () => Promise.resolve(null)),
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      const saveButton = getByLabelText("Guardar turno");
      expect(
        saveButton.props.accessibilityState?.disabled ??
          saveButton.props.disabled,
      ).toBe(true);
      const deleteButton = getByLabelText("Eliminar turno");
      expect(
        deleteButton.props.accessibilityState?.disabled ??
          deleteButton.props.disabled,
      ).toBe(true);
    });

    it("oculta ambos botones cuando ya está entregado", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "entregado" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { queryByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
      expect(queryByLabelText("Marcar entregado")).toBeNull();
    });

    it("oculta solo 'Marcar listo' cuando ya está en listo_para_entregar (pero permite entregar directo)", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "listo_para_entregar", operarioId: "op-1" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { queryByLabelText, getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
      expect(getByLabelText("Marcar entregado")).toBeTruthy();
    });

    it("al marcar listo, actualiza el badge de estado en pantalla", async () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "en_proceso", operarioId: "op-1" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });
      const markReady = jest.fn(async () =>
        Promise.resolve({ ...schedule, status: "listo_para_entregar" as const }),
      );
      mockUseScheduleStatusActions.mockReturnValue({
        isProcessing: false,
        error: null,
        markReady,
        markDelivered: jest.fn(async () => Promise.resolve(null)),
        applyCorrection: jest.fn(async () => Promise.resolve(null)),
      });

      const { getByLabelText, findByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Marcar listo para entregar"));

      expect(await findByText("Estado: Listo para entregar")).toBeTruthy();
      expect(markReady).toHaveBeenCalledTimes(1);
    });

    it("corrección manual pide confirmación antes de aplicar el nuevo estado", async () => {
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const confirm = buttons?.find((b) => b.text === "Confirmar");
        void confirm?.onPress?.();
      });
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "entregado" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });
      const applyCorrection = jest.fn(async () =>
        Promise.resolve({ ...schedule, status: "pendiente" as const }),
      );
      mockUseScheduleStatusActions.mockReturnValue({
        isProcessing: false,
        error: null,
        markReady: jest.fn(async () => Promise.resolve(null)),
        markDelivered: jest.fn(async () => Promise.resolve(null)),
        applyCorrection,
      });

      const { getByLabelText, findByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Corrección manual de estado"));
      fireEvent.press(getByLabelText("Corregir a Pendiente"));

      await waitFor(() => {
        expect(applyCorrection).toHaveBeenCalledWith("pendiente");
      });
      expect(await findByText("Estado: Pendiente")).toBeTruthy();
    });

    it("no ofrece el estado actual como opción de corrección manual", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: { ...schedule, status: "agendado" },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { getByLabelText, queryByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Corrección manual de estado"));

      expect(queryByLabelText("Corregir a Agendado")).toBeNull();
      expect(getByLabelText("Corregir a Pendiente")).toBeTruthy();
    });
  });
});
