import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import type React from "react";

import { useIdentityStore } from "../../../shared/state/identityStore";
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

// Turnos ya agendados para la fecha consultada por el chequeo de
// duplicados — por defecto vacío (sin duplicados) salvo que un test lo
// sobreescriba con mockGetByDate.mockResolvedValueOnce(...).
const mockGetByDate = jest.fn<(date: string) => Promise<Schedule[]>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getByDate: (date: string) => mockGetByDate(date),
  }),
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

const mockResolvePendingRegistration = jest.fn<() => Promise<void>>();
// Simula el mapa clientId -> nombre completo que ClientPickerField ya tiene
// cargado en memoria (ver `clientRepository.findAll()` dentro del propio
// componente) — los tests que necesiten resolver un nombre lo configuran
// llenando este objeto antes de renderizar.
const mockClientNamesById: Record<string, string> = {};
const mockResolveClientFullName = jest.fn<(id: string) => string | undefined>(
  (id: string) => mockClientNamesById[id],
);

jest.mock("../components/ClientPickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Text, TextInput, View } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  const ClientPickerField = ReactModule.forwardRef(function ClientPickerField(
    {
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
    },
    ref: React.Ref<unknown>,
  ) {
    ReactModule.useImperativeHandle(ref, () => ({
      resolvePendingRegistration: mockResolvePendingRegistration,
      resolveClientFullName: mockResolveClientFullName,
    }));

    return ReactModule.createElement(View, null, [
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
    ]);
  });

  return { ClientPickerField };
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
  isOwnerFlagged: false,
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
    mockResolvePendingRegistration.mockReset();
    mockResolvePendingRegistration.mockResolvedValue(undefined);
    mockResolveClientFullName.mockClear();
    for (const key of Object.keys(mockClientNamesById)) {
      delete mockClientNamesById[key];
    }
    mockGetByDate.mockReset();
    mockGetByDate.mockResolvedValue([]);
    useIdentityStore.getState().reset();
    // Varios tests espían Alert.alert con jest.spyOn dentro del propio
    // `it`; sin restaurarlo acá, el historial de llamadas (y la
    // implementación) de un test se filtraría al siguiente.
    jest.restoreAllMocks();
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

  it("ignora los puntos al escribir/pegar un precio (ej. '15.000' no se lee como 15)", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "15.000");
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ price: 15000 }),
      );
    });
  });

  it("solo muestra el campo de abono si hay un precio, y calcula el saldo pendiente", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByPlaceholderText, queryByPlaceholderText, findByText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(queryByPlaceholderText("Ej: 5000")).toBeNull();

    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "100000");
    fireEvent.changeText(getByPlaceholderText("Ej: 5000"), "30000");

    expect(await findByText(/Saldo pendiente/)).toBeTruthy();
  });

  it("envía el abono junto con el precio al guardar", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "100000");
    fireEvent.changeText(getByPlaceholderText("Ej: 5000"), "30000");
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ price: 100000, abono: 30000 }),
      );
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

  it("resuelve un registro de cliente a medio llenar antes de guardar el turno", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });
    const callOrder: string[] = [];
    mockResolvePendingRegistration.mockImplementation(async () => {
      callOrder.push("resolvePendingRegistration");
    });
    submit.mockImplementation(async () => {
      callOrder.push("submit");
      return schedule;
    });

    const { getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Nombre del cliente"), "Pedro Ramírez");
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalled();
    });
    expect(callOrder).toEqual(["resolvePendingRegistration", "submit"]);
  });

  it("muestra un error si las notas superan los 500 caracteres", async () => {
    const submit = jest.fn(async () => Promise.resolve(schedule));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
      syncScheduleSnapshot: jest.fn(),
    });

    const { getByLabelText, getByPlaceholderText, findByText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    const longNotes = "a".repeat(501);
    fireEvent.changeText(getByPlaceholderText("Detalles del turno"), longNotes);
    fireEvent.press(getByLabelText("Guardar turno"));

    expect(
      await findByText(/expected string to have <=500 characters/i),
    ).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it("permite asignar operario al crear un turno nuevo, sin pasar por una edición posterior", async () => {
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

    const newOperarioId = "33333333-3333-4333-8333-333333333333";
    fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
    fireEvent.changeText(getByLabelText("Operario"), newOperarioId);
    fireEvent.press(getByLabelText("Guardar turno"));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ operarioId: newOperarioId }),
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

  it("muestra el mensaje de error y no navega hacia atrás si falla la eliminación", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
      syncScheduleSnapshot: jest.fn(),
    });
    const deleteSchedule = jest.fn(async () => Promise.resolve(false));
    mockUseDeleteSchedule.mockReturnValue({
      isDeleting: false,
      error: "No se pudo eliminar el turno. Intenta nuevamente.",
      deleteSchedule,
    });
    const goBack = jest.fn();

    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b) => b.text === "Eliminar");
      void confirm?.onPress?.();
    });

    const { getByLabelText, findByText } = render(
      <ScheduleFormScreen
        {...buildProps(jest.fn(), goBack, schedule.id)}
      />,
    );

    fireEvent.press(getByLabelText("Eliminar turno"));

    await waitFor(() => {
      expect(deleteSchedule).toHaveBeenCalledWith(schedule.id);
    });

    expect(
      await findByText("No se pudo eliminar el turno. Intenta nuevamente."),
    ).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
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

    it("al marcar entregado con saldo pendiente, pide confirmación indicando el monto", async () => {
      jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
      mockUseScheduleForm.mockReturnValue({
        schedule: {
          ...schedule,
          status: "listo_para_entregar",
          operarioId: "op-1",
          price: 100000,
          abono: 30000,
        },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });
      const markDelivered = jest.fn(async () =>
        Promise.resolve({ ...schedule, status: "entregado" as const }),
      );
      mockUseScheduleStatusActions.mockReturnValue({
        isProcessing: false,
        error: null,
        markReady: jest.fn(async () => Promise.resolve(null)),
        markDelivered,
        applyCorrection: jest.fn(async () => Promise.resolve(null)),
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Saldo pendiente",
        expect.stringContaining("$70.000"),
        expect.anything(),
      );
      expect(markDelivered).not.toHaveBeenCalled();
    });

    it("al marcar entregado sin saldo pendiente, se marca directo sin pedir confirmación", async () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: {
          ...schedule,
          status: "listo_para_entregar",
          operarioId: "op-1",
          price: 100000,
          abono: 100000,
        },
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });
      const markDelivered = jest.fn(async () =>
        Promise.resolve({ ...schedule, status: "entregado" as const }),
      );
      mockUseScheduleStatusActions.mockReturnValue({
        isProcessing: false,
        error: null,
        markReady: jest.fn(async () => Promise.resolve(null)),
        markDelivered,
        applyCorrection: jest.fn(async () => Promise.resolve(null)),
      });

      const { getByLabelText, findByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn(), schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Marcar entregado"));

      expect(await findByText("Estado: Entregado")).toBeTruthy();
      expect(markDelivered).toHaveBeenCalledTimes(1);
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

  describe("conteo de turnos agendados", () => {
    it("al cambiar la fecha, muestra el conteo de turnos ya agendados para ese día (no entregados)", async () => {
      mockGetByDate.mockResolvedValue([
        { ...schedule, id: "s-1", status: "agendado" },
        { ...schedule, id: "s-2", status: "en_proceso" },
        { ...schedule, id: "s-3", status: "listo_para_entregar" },
      ]);
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(null)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { getByLabelText, findByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");

      expect(
        await findByText("3 turnos ya agendados para este día"),
      ).toBeTruthy();
    });

    it("un turno con status 'entregado' no cuenta en el conteo", async () => {
      mockGetByDate.mockResolvedValue([
        { ...schedule, id: "s-1", status: "entregado" },
      ]);
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(null)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { getByLabelText, findByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");

      expect(
        await findByText("Ningún turno agendado todavía"),
      ).toBeTruthy();
    });

    it("al editar un turno que es el único de esa fecha, el conteo lo excluye a sí mismo", async () => {
      mockGetByDate.mockResolvedValue([schedule]);
      mockUseScheduleForm.mockReturnValue({
        schedule,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(schedule)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { findByText } = render(
        <ScheduleFormScreen
          {...buildProps(jest.fn(), jest.fn(), schedule.id)}
        />,
      );

      expect(
        await findByText("Ningún turno agendado todavía"),
      ).toBeTruthy();
    });

    it("sin fecha seleccionada, no muestra ningún texto de conteo", () => {
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(null)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { queryByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      expect(queryByText("Ningún turno agendado todavía")).toBeNull();
      expect(queryByText(/turnos? ya agendados? para este día/)).toBeNull();
    });
  });

  describe("advertencia de turno duplicado", () => {
    const existingDuplicate: Schedule = {
      id: "44444444-4444-4444-8444-444444444444",
      date: "2026-08-10",
      clientId: schedule.clientId,
      isPriority: false,
      isOwnerFlagged: false,
      category: "arreglo",
      status: "agendado",
      statusLocked: false,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      syncStatus: "pending",
    };

    it("avisa si ya hay otro turno agendado ese mismo día para el mismo cliente, y cancelar no guarda", async () => {
      mockClientNamesById[schedule.clientId as string] = "Juan Pérez";
      mockGetByDate.mockResolvedValue([existingDuplicate]);
      const submit = jest.fn(async () => Promise.resolve(schedule));
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const cancel = buttons?.find((b) => b.text === "Cancelar");
        void cancel?.onPress?.();
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(mockGetByDate).toHaveBeenCalledWith("2026-08-10");
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        "Turno duplicado",
        expect.stringContaining("Juan Pérez"),
        expect.anything(),
      );
      expect(submit).not.toHaveBeenCalled();
    });

    it("confirmar 'Guardar de todas formas' sí guarda el turno duplicado", async () => {
      mockClientNamesById[schedule.clientId as string] = "Juan Pérez";
      mockGetByDate.mockResolvedValue([existingDuplicate]);
      const submit = jest.fn(async () => Promise.resolve(schedule));
      const goBack = jest.fn();
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const confirm = buttons?.find((b) => b.text === "Guardar de todas formas");
        void confirm?.onPress?.();
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), goBack)} />,
      );

      fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(submit).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(goBack).toHaveBeenCalled();
      });
    });

    it("editar un turno existente no lo compara contra sí mismo", async () => {
      mockClientNamesById[schedule.clientId as string] = "Juan Pérez";
      // El único turno de esa fecha es el propio turno en edición.
      mockGetByDate.mockResolvedValue([schedule]);
      const submit = jest.fn(async () => Promise.resolve(schedule));
      const goBack = jest.fn();
      mockUseScheduleForm.mockReturnValue({
        schedule,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), goBack, schedule.id)} />,
      );

      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(submit).toHaveBeenCalled();
      });
      expect(alertSpy).not.toHaveBeenCalledWith(
        "Turno duplicado",
        expect.anything(),
        expect.anything(),
      );
    });

    it("no avisa si el otro turno del mismo cliente es en una fecha distinta", async () => {
      mockClientNamesById[schedule.clientId as string] = "Juan Pérez";
      // getByDate ya filtra por fecha — para la fecha consultada no hay
      // ningún otro turno de este cliente.
      mockGetByDate.mockResolvedValue([]);
      const submit = jest.fn(async () => Promise.resolve(schedule));
      const goBack = jest.fn();
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), goBack)} />,
      );

      fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-20");
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(mockGetByDate).toHaveBeenCalledWith("2026-08-20");
      });
      await waitFor(() => {
        expect(submit).toHaveBeenCalled();
      });
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("un turno sin fecha (Pendientes) nunca avisa, sin consultar turnos existentes", async () => {
      mockClientNamesById[schedule.clientId as string] = "Juan Pérez";
      const submit = jest.fn(async () => Promise.resolve(schedule));
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      fireEvent.changeText(getByLabelText("Cliente"), schedule.clientId);
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(submit).toHaveBeenCalled();
      });
      expect(mockGetByDate).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("detecta la coincidencia con mayúsculas/espacios distintos (mismo criterio que normalizeText)", async () => {
      const otherUnregistered: Schedule = {
        ...existingDuplicate,
        clientId: undefined,
        unregisteredClientName: "Juan Pérez",
      };
      mockGetByDate.mockResolvedValue([otherUnregistered]);
      const submit = jest.fn(async () => Promise.resolve(schedule));
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const cancel = buttons?.find((b) => b.text === "Cancelar");
        void cancel?.onPress?.();
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      fireEvent.changeText(getByLabelText("Nombre del cliente"), "juan perez ");
      fireEvent.changeText(getByLabelText("Fecha"), "2026-08-10");
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Turno duplicado",
          expect.anything(),
          expect.anything(),
        );
      });
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("marca del dueño (isOwnerFlagged)", () => {
    it("con role=owner el switch se ve, es togglable y se envía en el submit", async () => {
      useIdentityStore.getState().setOwnProfile({
        id: "owner-1",
        displayName: "Dueño",
        role: "owner",
        isSharedDevice: false,
      });
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
      fireEvent(getByLabelText("Marca del dueño"), "valueChange", true);
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(submit).toHaveBeenCalledWith(
          expect.objectContaining({ isOwnerFlagged: true }),
        );
      });
    });

    it("con role=operario (dispositivo propio) el switch no existe en el árbol", () => {
      useIdentityStore.getState().setOwnProfile({
        id: "operario-1",
        displayName: "Operario",
        role: "operario",
        isSharedDevice: false,
      });
      mockUseScheduleForm.mockReturnValue({
        schedule: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit: jest.fn(async () => Promise.resolve(null)),
        syncScheduleSnapshot: jest.fn(),
      });

      const { queryByLabelText, queryByText } = render(
        <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
      );

      expect(queryByLabelText("Marca del dueño")).toBeNull();
      expect(queryByText(/Marca del dueño/)).toBeNull();
    });

    it("editar un turno ya marcado por el dueño conserva el valor guardado tras un submit de un operario", async () => {
      useIdentityStore.getState().setOwnProfile({
        id: "operario-1",
        displayName: "Operario",
        role: "operario",
        isSharedDevice: false,
      });
      const flaggedSchedule = { ...schedule, isOwnerFlagged: true };
      const submit = jest.fn(async () => Promise.resolve(flaggedSchedule));
      mockUseScheduleForm.mockReturnValue({
        schedule: flaggedSchedule,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submit,
        syncScheduleSnapshot: jest.fn(),
      });

      const { getByLabelText } = render(
        <ScheduleFormScreen
          {...buildProps(jest.fn(), jest.fn(), flaggedSchedule.id)}
        />,
      );

      await waitFor(() => {
        expect(getByLabelText("Guardar turno")).toBeTruthy();
      });
      fireEvent.press(getByLabelText("Guardar turno"));

      await waitFor(() => {
        expect(submit).toHaveBeenCalledWith(
          expect.objectContaining({ isOwnerFlagged: true }),
        );
      });
    });
  });
});
