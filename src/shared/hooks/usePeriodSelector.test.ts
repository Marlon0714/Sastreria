import { act, renderHook } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { usePeriodSelector } from "./usePeriodSelector";

describe("usePeriodSelector", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 15)); // 2026-08-15, sábado
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("arranca en modo 'semana' anclado a hoy, sin cambios de comportamiento (Decisión ya confirmada)", () => {
    const { result } = renderHook(() => usePeriodSelector());

    expect(result.current.mode).toBe("semana");
    expect(result.current.anchorDate).toBe("2026-08-15");
    expect(result.current.range).toEqual({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("arranca en modo 'dia' cuando se pasa initialMode='dia', sin saltar a 'semana'", () => {
    const { result } = renderHook(() => usePeriodSelector("dia"));

    expect(result.current.mode).toBe("dia");
    expect(result.current.anchorDate).toBe("2026-08-15");
    expect(result.current.range).toEqual({
      startDate: "2026-08-15",
      endDate: "2026-08-15",
    });
  });

  it("cambiar a 'dia' se queda en el día que contiene el anchorDate actual, no salta a hoy", () => {
    const { result } = renderHook(() => usePeriodSelector());

    act(() => {
      result.current.goToNext(); // semana siguiente: ancla pasa a 2026-08-22
    });
    act(() => {
      result.current.setMode("dia");
    });

    expect(result.current.anchorDate).toBe("2026-08-22");
    expect(result.current.range).toEqual({
      startDate: "2026-08-22",
      endDate: "2026-08-22",
    });
  });

  it("cambiar a 'mes' normaliza el ancla al día 1 del mes que contiene el anchorDate actual", () => {
    const { result } = renderHook(() => usePeriodSelector());

    act(() => {
      result.current.setMode("mes");
    });

    expect(result.current.anchorDate).toBe("2026-08-01");
    expect(result.current.range).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
  });

  it("cambiar a 'rango' no altera el anchorDate (irrelevante en ese modo)", () => {
    const { result } = renderHook(() => usePeriodSelector());

    act(() => {
      result.current.setMode("rango");
    });

    expect(result.current.anchorDate).toBe("2026-08-15");
    expect(result.current.range).toBeNull();
  });

  it("goToPrevious/goToNext en modo 'dia' desplazan ±1 día", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("dia"));

    act(() => result.current.goToNext());
    expect(result.current.anchorDate).toBe("2026-08-16");

    act(() => result.current.goToPrevious());
    expect(result.current.anchorDate).toBe("2026-08-15");
  });

  it("goToPrevious/goToNext en modo 'semana' desplazan ±7 días", () => {
    const { result } = renderHook(() => usePeriodSelector());

    act(() => result.current.goToNext());
    expect(result.current.anchorDate).toBe("2026-08-22");

    act(() => result.current.goToPrevious());
    expect(result.current.anchorDate).toBe("2026-08-15");
  });

  it("goToPrevious/goToNext en modo 'mes' desplazan ±1 mes normalizado a día 1", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("mes"));

    act(() => result.current.goToNext());
    expect(result.current.anchorDate).toBe("2026-09-01");

    act(() => result.current.goToPrevious());
    act(() => result.current.goToPrevious());
    expect(result.current.anchorDate).toBe("2026-07-01");
  });

  it("goToPrevious/goToNext son no-op en modo 'rango'", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("rango"));

    act(() => result.current.goToNext());
    act(() => result.current.goToPrevious());

    expect(result.current.anchorDate).toBe("2026-08-15");
  });

  it("'rango' sin fechas: range null, sin rangeError (estado incompleto, no inválido)", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("rango"));

    expect(result.current.range).toBeNull();
    expect(result.current.rangeError).toBeNull();
  });

  it("'rango' con fin < inicio: rangeError con mensaje, range null", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("rango"));

    act(() => {
      result.current.setCustomRangeStart("2026-08-20");
      result.current.setCustomRangeEnd("2026-08-10");
    });

    expect(result.current.range).toBeNull();
    expect(result.current.rangeError).not.toBeNull();
  });

  it("'rango' con fechas válidas: range no nulo, sin rangeError", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("rango"));

    act(() => {
      result.current.setCustomRangeStart("2026-08-10");
      result.current.setCustomRangeEnd("2026-08-20");
    });

    expect(result.current.range).toEqual({
      startDate: "2026-08-10",
      endDate: "2026-08-20",
    });
    expect(result.current.rangeError).toBeNull();
  });

  it("canGoToCurrentPeriod en modo 'dia': false hoy, true tras navegar", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("dia"));

    expect(result.current.canGoToCurrentPeriod).toBe(false);

    act(() => result.current.goToNext());
    expect(result.current.canGoToCurrentPeriod).toBe(true);

    act(() => result.current.goToCurrentPeriod());
    expect(result.current.canGoToCurrentPeriod).toBe(false);
    expect(result.current.anchorDate).toBe("2026-08-15");
  });

  it("canGoToCurrentPeriod en modo 'semana': false en la semana actual, true fuera de ella", () => {
    const { result } = renderHook(() => usePeriodSelector());

    expect(result.current.canGoToCurrentPeriod).toBe(false);

    act(() => result.current.goToNext());
    expect(result.current.canGoToCurrentPeriod).toBe(true);
  });

  it("canGoToCurrentPeriod en modo 'mes': false en el mes actual, true fuera de él", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("mes"));

    expect(result.current.canGoToCurrentPeriod).toBe(false);

    act(() => result.current.goToNext());
    expect(result.current.canGoToCurrentPeriod).toBe(true);

    act(() => result.current.goToCurrentPeriod());
    expect(result.current.canGoToCurrentPeriod).toBe(false);
    expect(result.current.anchorDate).toBe("2026-08-01");
  });

  it("canGoToCurrentPeriod en modo 'rango': siempre false (atajo oculto)", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("rango"));

    expect(result.current.canGoToCurrentPeriod).toBe(false);
  });

  it("weekDatesForBreakdown solo es no-null en modo 'semana'", () => {
    const { result } = renderHook(() => usePeriodSelector());
    expect(result.current.weekDatesForBreakdown).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);

    act(() => result.current.setMode("dia"));
    expect(result.current.weekDatesForBreakdown).toBeNull();

    act(() => result.current.setMode("mes"));
    expect(result.current.weekDatesForBreakdown).toBeNull();

    act(() => result.current.setMode("rango"));
    expect(result.current.weekDatesForBreakdown).toBeNull();
  });

  it("jumpToDate cambia el anchorDate directamente", () => {
    const { result } = renderHook(() => usePeriodSelector());
    act(() => result.current.setMode("dia"));

    act(() => result.current.jumpToDate("2026-09-01"));

    expect(result.current.anchorDate).toBe("2026-09-01");
  });
});
