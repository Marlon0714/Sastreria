import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { PeriodSelectorField } from "./PeriodSelectorField";

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

function buildBaseProps() {
  return {
    mode: "semana" as const,
    onModeChange: jest.fn(),
    periodLabel: "Semana del 10 ago al 16 ago",
    anchorDate: "2026-08-12",
    onJumpToDate: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    canGoToCurrentPeriod: false,
    onGoToCurrentPeriod: jest.fn(),
    customRangeStart: undefined,
    customRangeEnd: undefined,
    onCustomRangeStartChange: jest.fn(),
    onCustomRangeEndChange: jest.fn(),
    rangeError: null,
  };
}

describe("PeriodSelectorField", () => {
  it("muestra el label del modo activo en el chip", () => {
    const { getByText } = render(
      <PeriodSelectorField {...buildBaseProps()} />,
    );

    expect(getByText("Semana")).toBeTruthy();
  });

  it("al abrir el menú muestra las 4 opciones", () => {
    const { getByLabelText, getByText } = render(
      <PeriodSelectorField {...buildBaseProps()} />,
    );

    fireEvent.press(getByLabelText("Cambiar periodo del resumen"));

    expect(getByText("Día")).toBeTruthy();
    expect(getByText("Mes")).toBeTruthy();
    expect(getByText("Rango personalizado")).toBeTruthy();
  });

  it("marca como checked la opción activa", () => {
    const { getByLabelText } = render(
      <PeriodSelectorField {...buildBaseProps()} />,
    );

    fireEvent.press(getByLabelText("Cambiar periodo del resumen"));

    expect(
      getByLabelText("Ver resumen por semana").props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      getByLabelText("Ver resumen por día").props.accessibilityState,
    ).toEqual({ checked: false });
  });

  it("elegir una opción llama a onModeChange y cierra el menú", () => {
    const onModeChange = jest.fn();
    const { getByLabelText, queryByText } = render(
      <PeriodSelectorField {...buildBaseProps()} onModeChange={onModeChange} />,
    );

    fireEvent.press(getByLabelText("Cambiar periodo del resumen"));
    fireEvent.press(getByLabelText("Ver resumen por mes"));

    expect(onModeChange).toHaveBeenCalledWith("mes");
    expect(queryByText("Rango personalizado")).toBeNull();
  });

  it("dispara onPrevious/onNext al presionar las flechas", () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const { getByLabelText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    fireEvent.press(getByLabelText("Periodo anterior"));
    fireEvent.press(getByLabelText("Periodo siguiente"));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("muestra el atajo de periodo actual solo si canGoToCurrentPeriod es true", () => {
    const { queryByLabelText, rerender } = render(
      <PeriodSelectorField {...buildBaseProps()} canGoToCurrentPeriod={false} />,
    );

    expect(queryByLabelText("Semana actual")).toBeNull();

    rerender(
      <PeriodSelectorField {...buildBaseProps()} canGoToCurrentPeriod />,
    );

    expect(queryByLabelText("Semana actual")).toBeTruthy();
  });

  it("presionar el atajo de periodo actual llama a onGoToCurrentPeriod", () => {
    const onGoToCurrentPeriod = jest.fn();
    const { getByLabelText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        canGoToCurrentPeriod
        onGoToCurrentPeriod={onGoToCurrentPeriod}
      />,
    );

    fireEvent.press(getByLabelText("Semana actual"));

    expect(onGoToCurrentPeriod).toHaveBeenCalledTimes(1);
  });

  it("modo 'dia': muestra el atajo con la etiqueta 'Ir a hoy' y el picker de salto directo", () => {
    const onJumpToDate = jest.fn();
    const { getByLabelText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        mode="dia"
        canGoToCurrentPeriod
        onJumpToDate={onJumpToDate}
      />,
    );

    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Elegir fecha"));
    fireEvent.press(getByLabelText("native-picker-confirm"));

    expect(onJumpToDate).toHaveBeenCalledWith("2026-08-15");
  });

  it("modo distinto de 'dia' no muestra el picker de salto directo", () => {
    const { queryByLabelText } = render(
      <PeriodSelectorField {...buildBaseProps()} mode="mes" />,
    );

    expect(queryByLabelText("Elegir fecha")).toBeNull();
  });

  it("modo 'rango': muestra los dos campos de fecha en vez de la navegación prev/next", () => {
    const { queryByLabelText, getByLabelText } = render(
      <PeriodSelectorField {...buildBaseProps()} mode="rango" />,
    );

    expect(queryByLabelText("Periodo anterior")).toBeNull();
    expect(queryByLabelText("Periodo siguiente")).toBeNull();
    expect(getByLabelText("Fecha de inicio del rango")).toBeTruthy();
    expect(getByLabelText("Fecha de fin del rango")).toBeTruthy();
  });

  it("modo 'rango': nunca muestra el atajo de periodo actual, aunque canGoToCurrentPeriod sea true", () => {
    const { queryByText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        mode="rango"
        canGoToCurrentPeriod
      />,
    );

    expect(queryByText("Ir a hoy")).toBeNull();
    expect(queryByText("Semana actual")).toBeNull();
    expect(queryByText("Mes actual")).toBeNull();
  });

  it("modo 'rango': dispara onCustomRangeStartChange/onCustomRangeEndChange al elegir fecha", () => {
    const onCustomRangeStartChange = jest.fn();
    const { getByLabelText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        mode="rango"
        onCustomRangeStartChange={onCustomRangeStartChange}
      />,
    );

    fireEvent.press(getByLabelText("Fecha de inicio del rango"));
    fireEvent.press(getByLabelText("native-picker-confirm"));

    expect(onCustomRangeStartChange).toHaveBeenCalledWith("2026-08-15");
  });

  it("modo 'rango': no revienta si rangeError está presente, y lo muestra", () => {
    const { getByText } = render(
      <PeriodSelectorField
        {...buildBaseProps()}
        mode="rango"
        rangeError="La fecha final no puede ser anterior a la fecha inicial."
      />,
    );

    expect(
      getByText("La fecha final no puede ser anterior a la fecha inicial."),
    ).toBeTruthy();
  });

  it("modo 'rango': no muestra ningún error si rangeError es null", () => {
    const { queryByText } = render(
      <PeriodSelectorField {...buildBaseProps()} mode="rango" rangeError={null} />,
    );

    expect(
      queryByText("La fecha final no puede ser anterior a la fecha inicial."),
    ).toBeNull();
  });
});
