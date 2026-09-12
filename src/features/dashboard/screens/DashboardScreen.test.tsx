import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { ReminderItem } from "../domain/overdueSchedules";
import type { PeriodMode } from "../domain/periodRange";
import type { Schedule } from "../../schedule/domain/types";
import DashboardScreen from "./DashboardScreen";

interface UseDashboardStatsResult {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  anchorDate: string;
  periodLabel: string;
  range: { startDate: string; endDate: string } | null;
  rangeError: string | null;
  isRangeIncomplete: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrentPeriod: () => void;
  canGoToCurrentPeriod: boolean;
  jumpToDate: (date: string) => void;
  customRangeStart: string | undefined;
  customRangeEnd: string | undefined;
  setCustomRangeStart: (date: string | undefined) => void;
  setCustomRangeEnd: (date: string | undefined) => void;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  dailyWorkload: number[];
  periodStatusCounts: {
    total: number;
    pendiente: number;
    agendado: number;
    en_proceso: number;
    listo_para_entregar: number;
    entregado: number;
  };
  periodMoneyTotals: {
    totalPrice: number;
    totalAbono: number;
    totalSaldoPendiente: number;
  };
  notRealizedInPeriod: number;
  globalPendingCount: number;
  overdueCount: number;
  upcomingCount: number;
  reminders: ReminderItem[];
}

const mockUseDashboardStats = jest.fn<() => UseDashboardStatsResult>();

jest.mock("../hooks/useDashboardStats", () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

jest.mock("@react-navigation/native", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, [effect]);
    },
  };
});

function makeSchedule(overrides: Partial<Schedule> & { id: string }): Schedule {
  return {
    isPriority: false,
    isOwnerFlagged: false,
    category: "arreglo",
    status: "listo_para_entregar",
    statusLocked: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

function buildBaseResult(
  overrides: Partial<UseDashboardStatsResult> = {},
): UseDashboardStatsResult {
  return {
    mode: "semana",
    setMode: jest.fn(),
    anchorDate: "2026-08-15",
    periodLabel: "Semana del 10 ago al 16 ago",
    range: { startDate: "2026-08-10", endDate: "2026-08-16" },
    rangeError: null,
    isRangeIncomplete: false,
    goToPrevious: jest.fn(),
    goToNext: jest.fn(),
    goToCurrentPeriod: jest.fn(),
    canGoToCurrentPeriod: false,
    jumpToDate: jest.fn(),
    customRangeStart: undefined,
    customRangeEnd: undefined,
    setCustomRangeStart: jest.fn(),
    setCustomRangeEnd: jest.fn(),
    isLoading: false,
    error: null,
    reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    dailyWorkload: [0, 0, 0, 0, 0, 0, 0],
    periodStatusCounts: {
      total: 0,
      pendiente: 0,
      agendado: 0,
      en_proceso: 0,
      listo_para_entregar: 0,
      entregado: 0,
    },
    periodMoneyTotals: {
      totalPrice: 0,
      totalAbono: 0,
      totalSaldoPendiente: 0,
    },
    notRealizedInPeriod: 0,
    globalPendingCount: 0,
    overdueCount: 0,
    upcomingCount: 0,
    reminders: [],
    ...overrides,
  };
}

type ScreenProps = React.ComponentProps<typeof DashboardScreen>;

interface FakeParentNavigator {
  navigate: jest.Mock;
}

function buildProps(
  parent: FakeParentNavigator | null = null,
  navigate: jest.Mock = jest.fn(),
): ScreenProps {
  return {
    navigation: {
      getParent: () => parent,
      navigate,
    } as unknown as ScreenProps["navigation"],
    route: {
      key: "DashboardHome-test",
      name: "DashboardHome",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

describe("DashboardScreen", () => {
  beforeEach(() => {
    mockUseDashboardStats.mockReset();
  });

  it("muestra el estado de carga", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({ isLoading: true }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps()} />);

    expect(getByText("Cargando resumen del negocio...")).toBeTruthy();
  });

  it("muestra el estado de error y permite reintentar", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        error: "No se pudo cargar el resumen del negocio.",
        reload,
      }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps()} />);

    expect(getByText("No se pudo cargar el resumen del negocio.")).toBeTruthy();
    fireEvent.press(getByText("Reintentar"));
    expect(reload).toHaveBeenCalled();
  });

  it("muestra los datos cargados", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        periodStatusCounts: {
          total: 5,
          pendiente: 0,
          agendado: 2,
          en_proceso: 1,
          listo_para_entregar: 1,
          entregado: 1,
        },
      }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps()} />);

    expect(getByText("¿Cómo van los turnos de esta semana?")).toBeTruthy();
    expect(getByText("5")).toBeTruthy();
  });

  it("modo 'dia': usa los títulos de sección dependientes del modo", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({ mode: "dia", range: { startDate: "2026-08-15", endDate: "2026-08-15" } }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps()} />);

    expect(getByText("¿Cómo van los turnos de este día?")).toBeTruthy();
    expect(getByText("Facturación del día")).toBeTruthy();
    expect(getByText("No realizados este día")).toBeTruthy();
  });

  it("modo 'mes': usa los títulos de sección dependientes del modo", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "mes",
        range: { startDate: "2026-08-01", endDate: "2026-08-31" },
      }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps()} />);

    expect(getByText("¿Cómo van los turnos de este mes?")).toBeTruthy();
    expect(getByText("Facturación del mes")).toBeTruthy();
    expect(getByText("No realizados este mes")).toBeTruthy();
  });

  it("WeeklyWorkloadBreakdown solo se muestra en modo 'semana'", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult({ mode: "semana" }));
    const { getByText, rerender } = render(<DashboardScreen {...buildProps()} />);
    expect(getByText("Turnos agendados por día")).toBeTruthy();

    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "dia",
        range: { startDate: "2026-08-15", endDate: "2026-08-15" },
      }),
    );
    rerender(<DashboardScreen {...buildProps()} />);
    expect(() => getByText("Turnos agendados por día")).toThrow();
  });

  it("WeeklyWorkloadBreakdown ausente en modo 'mes'", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "mes",
        range: { startDate: "2026-08-01", endDate: "2026-08-31" },
      }),
    );

    const { queryByText } = render(<DashboardScreen {...buildProps()} />);

    expect(queryByText("Turnos agendados por día")).toBeNull();
  });

  it("WeeklyWorkloadBreakdown ausente en modo 'rango'", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "rango",
        range: { startDate: "2026-08-01", endDate: "2026-08-15" },
      }),
    );

    const { queryByText } = render(<DashboardScreen {...buildProps()} />);

    expect(queryByText("Turnos agendados por día")).toBeNull();
  });

  it("modo 'rango' incompleto: muestra el estado vacío en vez de las tarjetas", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "rango",
        range: null,
        isRangeIncomplete: true,
      }),
    );

    const { getByText, queryByText } = render(
      <DashboardScreen {...buildProps()} />,
    );

    expect(
      getByText("Elige fecha de inicio y fin para ver el resumen."),
    ).toBeTruthy();
    expect(queryByText("¿Cómo van los turnos de este rango?")).toBeNull();
  });

  it("modo 'rango' inválido (fechas elegidas pero fin antes que inicio): muestra el mensaje de corregir, no el de elegir fecha ni tarjetas en cero", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "rango",
        range: null,
        isRangeIncomplete: true,
        rangeError: "La fecha final no puede ser anterior a la inicial.",
      }),
    );

    const { getByText, queryByText } = render(
      <DashboardScreen {...buildProps()} />,
    );

    expect(
      getByText("Corrige el rango de fechas para ver el resumen."),
    ).toBeTruthy();
    expect(
      queryByText("Elige fecha de inicio y fin para ver el resumen."),
    ).toBeNull();
    expect(queryByText("¿Cómo van los turnos de este rango?")).toBeNull();
  });

  it("modo 'rango' completo: muestra las tarjetas con los títulos de rango", () => {
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({
        mode: "rango",
        range: { startDate: "2026-08-01", endDate: "2026-08-15" },
        isRangeIncomplete: false,
      }),
    );

    const { getByText, queryByText } = render(
      <DashboardScreen {...buildProps()} />,
    );

    expect(getByText("¿Cómo van los turnos de este rango?")).toBeTruthy();
    expect(
      queryByText("Elige fecha de inicio y fin para ver el resumen."),
    ).toBeNull();
  });

  it("al tocar un recordatorio navega cruzando de tab a ScheduleForm con el scheduleId", () => {
    const reminder: ReminderItem = {
      schedule: makeSchedule({ id: "schedule-123" }),
      clientLabel: "Ana Torres",
      daysWaiting: 32,
      severity: "vencido",
    };
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({ reminders: [reminder] }),
    );
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps({ navigate })} />,
    );

    fireEvent.press(getByText("Ana Torres"));

    expect(navigate).toHaveBeenCalledWith("ScheduleTab", {
      screen: "ScheduleForm",
      params: { scheduleId: "schedule-123" },
    });
  });

  it("no falla si no hay parent navigator al tocar un recordatorio", () => {
    const reminder: ReminderItem = {
      schedule: makeSchedule({ id: "schedule-123" }),
      clientLabel: "Ana Torres",
      daysWaiting: 32,
      severity: "vencido",
    };
    mockUseDashboardStats.mockReturnValue(
      buildBaseResult({ reminders: [reminder] }),
    );

    const { getByText } = render(<DashboardScreen {...buildProps(null)} />);

    expect(() => fireEvent.press(getByText("Ana Torres"))).not.toThrow();
  });

  it("al tocar la tarjeta 'Total' navega a ScheduleListByStatus con el bucket y rango del periodo", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult());
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps(null, navigate)} />,
    );

    fireEvent.press(getByText("Total"));

    expect(navigate).toHaveBeenCalledWith("ScheduleListByStatus", {
      bucket: "total",
      cardLabel: "Total",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("al tocar la tarjeta 'Pendientes' navega con bucket 'pendiente'", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult());
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps(null, navigate)} />,
    );

    fireEvent.press(getByText("Pendientes"));

    expect(navigate).toHaveBeenCalledWith("ScheduleListByStatus", {
      bucket: "pendiente",
      cardLabel: "Pendientes",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("al tocar 'No realizados esta semana' navega con bucket 'no_realizado' y el cardLabel dinámico", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult({ mode: "semana" }));
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps(null, navigate)} />,
    );

    fireEvent.press(getByText("No realizados esta semana"));

    expect(navigate).toHaveBeenCalledWith("ScheduleListByStatus", {
      bucket: "no_realizado",
      cardLabel: "No realizados esta semana",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("al tocar 'Sin fecha (global)' navega con bucket 'sin_fecha_global' SIN startDate/endDate", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult());
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps(null, navigate)} />,
    );

    fireEvent.press(getByText("Sin fecha (global)"));

    expect(navigate).toHaveBeenCalledWith("ScheduleListByStatus", {
      bucket: "sin_fecha_global",
      cardLabel: "Sin fecha (global)",
      startDate: undefined,
      endDate: undefined,
    });
  });

  it("las tarjetas de dinero (Facturación) no navegan al tocarlas", () => {
    mockUseDashboardStats.mockReturnValue(buildBaseResult());
    const navigate = jest.fn();

    const { getByText } = render(
      <DashboardScreen {...buildProps(null, navigate)} />,
    );

    fireEvent.press(getByText("Valor total de los trabajos"));
    fireEvent.press(getByText("Total pagado por los clientes"));
    fireEvent.press(getByText("Falta por cobrar"));

    expect(navigate).not.toHaveBeenCalled();
  });
});
