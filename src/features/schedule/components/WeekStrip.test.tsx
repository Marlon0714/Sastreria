import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { WeekStrip } from "./WeekStrip";

const WEEK = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

describe("WeekStrip", () => {
  it("muestra los 7 días de la semana con su número", () => {
    const { getByLabelText } = render(
      <WeekStrip
        weekDates={WEEK}
        selectedDate="2026-08-12"
        onSelectDate={jest.fn()}
        onPrevWeek={jest.fn()}
        onNextWeek={jest.fn()}
      />,
    );

    expect(getByLabelText("Ir al Lun 10")).toBeTruthy();
    expect(getByLabelText("Ir al Mié 12")).toBeTruthy();
    expect(getByLabelText("Ir al Dom 16")).toBeTruthy();
  });

  it("marca como seleccionado el día activo", () => {
    const { getByLabelText } = render(
      <WeekStrip
        weekDates={WEEK}
        selectedDate="2026-08-12"
        onSelectDate={jest.fn()}
        onPrevWeek={jest.fn()}
        onNextWeek={jest.fn()}
      />,
    );

    expect(getByLabelText("Ir al Mié 12").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByLabelText("Ir al Lun 10").props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it("llama a onSelectDate con la fecha del día presionado", () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = render(
      <WeekStrip
        weekDates={WEEK}
        selectedDate="2026-08-12"
        onSelectDate={onSelectDate}
        onPrevWeek={jest.fn()}
        onNextWeek={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText("Ir al Vie 14"));

    expect(onSelectDate).toHaveBeenCalledWith("2026-08-14");
  });

  it("llama a onPrevWeek/onNextWeek al presionar las flechas", () => {
    const onPrevWeek = jest.fn();
    const onNextWeek = jest.fn();
    const { getByLabelText } = render(
      <WeekStrip
        weekDates={WEEK}
        selectedDate="2026-08-12"
        onSelectDate={jest.fn()}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />,
    );

    fireEvent.press(getByLabelText("Semana anterior"));
    fireEvent.press(getByLabelText("Semana siguiente"));

    expect(onPrevWeek).toHaveBeenCalledTimes(1);
    expect(onNextWeek).toHaveBeenCalledTimes(1);
  });
});
