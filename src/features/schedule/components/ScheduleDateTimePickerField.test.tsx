import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { ScheduleDateTimePickerField } from "./ScheduleDateTimePickerField";

jest.mock("@react-native-community/datetimepicker", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Pressable, Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  const mockFixedTestDate = new Date(2026, 7, 15, 9, 30); // 2026-08-15 09:30

  const MockDateTimePicker = ({
    onChange,
  }: {
    onChange: (event: { type: string }, date?: Date) => void;
  }) =>
    ReactModule.createElement(
      Pressable,
      {
        accessibilityLabel: "native-picker-confirm",
        onPress: () => onChange({ type: "set" }, mockFixedTestDate),
      },
      ReactModule.createElement(Text, null, "confirmar"),
    );

  return { __esModule: true, default: MockDateTimePicker };
});

describe("ScheduleDateTimePickerField", () => {
  describe("mode='date'", () => {
    it("muestra el placeholder cuando no hay valor", () => {
      const { getByText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          onChange={jest.fn()}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
        />,
      );

      expect(getByText("Sin fecha")).toBeTruthy();
    });

    it("muestra la fecha formateada cuando hay valor", () => {
      const { getByText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          value="2026-08-10"
          onChange={jest.fn()}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
        />,
      );

      expect(getByText("10/08/2026")).toBeTruthy();
    });

    it("abre el picker nativo y confirma la fecha elegida", () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          onChange={onChange}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
        />,
      );

      fireEvent.press(getByLabelText("Fecha"));
      fireEvent.press(getByLabelText("native-picker-confirm"));

      expect(onChange).toHaveBeenCalledWith("2026-08-15");
    });

    it("permite quitar la fecha ya seleccionada", () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          value="2026-08-10"
          onChange={onChange}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
        />,
      );

      fireEvent.press(getByLabelText("Quitar fecha"));

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("con variant='dayNavigator' muestra un formato más descriptivo (día de semana)", () => {
      const { getByText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          variant="dayNavigator"
          value="2026-08-10"
          onChange={jest.fn()}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
        />,
      );

      expect(getByText("Lun, 10 de ago")).toBeTruthy();
    });

    it("no muestra el botón de quitar cuando allowClear=false", () => {
      const { queryByLabelText } = render(
        <ScheduleDateTimePickerField
          mode="date"
          value="2026-08-10"
          onChange={jest.fn()}
          placeholder="Sin fecha"
          accessibilityLabel="Fecha"
          allowClear={false}
        />,
      );

      expect(queryByLabelText("Quitar fecha")).toBeNull();
    });
  });

  describe("mode='time'", () => {
    it("muestra la hora en formato HH:mm", () => {
      const { getByText } = render(
        <ScheduleDateTimePickerField
          mode="time"
          value="14:30"
          onChange={jest.fn()}
          placeholder="Sin hora"
          accessibilityLabel="Hora"
        />,
      );

      expect(getByText("14:30")).toBeTruthy();
    });

    it("confirma la hora elegida en formato HH:mm", () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <ScheduleDateTimePickerField
          mode="time"
          onChange={onChange}
          placeholder="Sin hora"
          accessibilityLabel="Hora"
        />,
      );

      fireEvent.press(getByLabelText("Hora"));
      fireEvent.press(getByLabelText("native-picker-confirm"));

      expect(onChange).toHaveBeenCalledWith("09:30");
    });
  });

  it("muestra el mensaje de error cuando se provee", () => {
    const { getByText } = render(
      <ScheduleDateTimePickerField
        mode="date"
        onChange={jest.fn()}
        placeholder="Sin fecha"
        accessibilityLabel="Fecha"
        errorMessage="La fecha es inválida"
      />,
    );

    expect(getByText("La fecha es inválida")).toBeTruthy();
  });
});
