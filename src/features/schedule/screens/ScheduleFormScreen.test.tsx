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

jest.mock("../components/ClientPickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Text, TextInput, View } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    ClientPickerField: ({
      value,
      onChange,
      errorMessage,
    }: {
      value: string;
      onChange: (id: string) => void;
      errorMessage?: string;
    }) =>
      ReactModule.createElement(View, null, [
        ReactModule.createElement(TextInput, {
          key: "input",
          accessibilityLabel: "Cliente",
          value,
          onChangeText: onChange,
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

type ScreenProps = React.ComponentProps<typeof ScheduleFormScreen>;

function buildProps(
  navigate: jest.Mock,
  goBack: jest.Mock,
  scheduleId?: string,
): ScreenProps {
  return {
    navigation: { navigate, goBack } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleForm-test",
      name: "ScheduleForm",
      params: { scheduleId },
    } as unknown as ScreenProps["route"],
  };
}

const schedule: Schedule = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  clientId: "22222222-2222-4222-8222-222222222222",
  notes: "Ajuste de traje",
  status: "agendado",
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
  });

  it("renders create mode without a delete button", () => {
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
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
    });
    const goBack = jest.fn();

    const { getByPlaceholderText, getByLabelText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), goBack)} />,
    );

    fireEvent.changeText(getByPlaceholderText("AAAA-MM-DD"), "2026-08-10");
    fireEvent.changeText(getByPlaceholderText("HH:MM"), "14:30");
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

  it("permite guardar sin fecha/hora, pero exige cliente", async () => {
    const submit = jest.fn(async () => Promise.resolve(null));
    mockUseScheduleForm.mockReturnValue({
      schedule: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit,
    });

    const { getByLabelText, findByText } = render(
      <ScheduleFormScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Guardar turno"));

    expect(await findByText("El cliente es inválido")).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it("pre-fills fields, muestra el estado y el botón de eliminar en modo edición", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
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

  it("deletes the schedule after confirming and navigates back", async () => {
    mockUseScheduleForm.mockReturnValue({
      schedule,
      isLoading: false,
      isSubmitting: false,
      error: null,
      submit: jest.fn(async () => Promise.resolve(schedule)),
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
});
