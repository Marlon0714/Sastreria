import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { ReminderItem } from "../domain/overdueSchedules";
import type { Schedule } from "../../schedule/domain/types";
import DashboardScreen from "./DashboardScreen";

interface UseDashboardStatsResult {
  selectedDate: string;
  weekDates: string[];
  selectDate: (date: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  dailyWorkload: number[];
  weeklyStatusCounts: {
    total: number;
    pendiente: number;
    agendado: number;
    en_proceso: number;
    listo_para_entregar: number;
    entregado: number;
  };
  weeklyMoneyTotals: {
    totalPrice: number;
    totalAbono: number;
    totalSaldoPendiente: number;
  };
  notRealizedInWeek: number;
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

const WEEK_DATES = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

function buildBaseResult(
  overrides: Partial<UseDashboardStatsResult> = {},
): UseDashboardStatsResult {
  return {
    selectedDate: "2026-08-15",
    weekDates: WEEK_DATES,
    selectDate: jest.fn(),
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    isLoading: false,
    error: null,
    reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    dailyWorkload: [0, 0, 0, 0, 0, 0, 0],
    weeklyStatusCounts: {
      total: 0,
      pendiente: 0,
      agendado: 0,
      en_proceso: 0,
      listo_para_entregar: 0,
      entregado: 0,
    },
    weeklyMoneyTotals: {
      totalPrice: 0,
      totalAbono: 0,
      totalSaldoPendiente: 0,
    },
    notRealizedInWeek: 0,
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

function buildProps(parent: FakeParentNavigator | null = null): ScreenProps {
  return {
    navigation: {
      getParent: () => parent,
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
        weeklyStatusCounts: {
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
});
