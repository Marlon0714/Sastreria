import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { Schedule } from "../../schedule/domain/types";
import type { ScheduleListItem } from "../domain/scheduleListBucket";
import ScheduleListByStatusScreen from "./ScheduleListByStatusScreen";

interface UseScheduleListByStatusResult {
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  items: ScheduleListItem[];
}

const mockUseScheduleListByStatus =
  jest.fn<() => UseScheduleListByStatusResult>();

jest.mock("../hooks/useScheduleListByStatus", () => ({
  useScheduleListByStatus: (...args: unknown[]) =>
    mockUseScheduleListByStatus(...(args as [])),
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
    status: "agendado",
    statusLocked: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    syncStatus: "pending",
    ...overrides,
  };
}

function buildBaseResult(
  overrides: Partial<UseScheduleListByStatusResult> = {},
): UseScheduleListByStatusResult {
  return {
    isLoading: false,
    error: null,
    reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    items: [],
    ...overrides,
  };
}

type ScreenProps = React.ComponentProps<typeof ScheduleListByStatusScreen>;

interface FakeParentNavigator {
  navigate: jest.Mock;
}

function buildProps(parent: FakeParentNavigator | null = null): ScreenProps {
  return {
    navigation: {
      getParent: () => parent,
    } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleListByStatus-test",
      name: "ScheduleListByStatus",
      params: {
        bucket: "agendado",
        cardLabel: "Agendados",
        startDate: "2026-08-10",
        endDate: "2026-08-16",
      },
    } as unknown as ScreenProps["route"],
  };
}

describe("ScheduleListByStatusScreen", () => {
  beforeEach(() => {
    mockUseScheduleListByStatus.mockReset();
  });

  it("muestra el estado de carga", () => {
    mockUseScheduleListByStatus.mockReturnValue(
      buildBaseResult({ isLoading: true }),
    );

    const { getByText } = render(<ScheduleListByStatusScreen {...buildProps()} />);

    expect(getByText("Cargando turnos...")).toBeTruthy();
  });

  it("muestra el estado de error y permite reintentar", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseScheduleListByStatus.mockReturnValue(
      buildBaseResult({ error: "No se pudo cargar la lista de turnos.", reload }),
    );

    const { getByText } = render(<ScheduleListByStatusScreen {...buildProps()} />);

    expect(getByText("No se pudo cargar la lista de turnos.")).toBeTruthy();
    fireEvent.press(getByText("Reintentar"));
    expect(reload).toHaveBeenCalled();
  });

  it("muestra el empty-state cuando no hay turnos", () => {
    mockUseScheduleListByStatus.mockReturnValue(buildBaseResult({ items: [] }));

    const { getByText } = render(<ScheduleListByStatusScreen {...buildProps()} />);

    expect(getByText("No hay turnos en este grupo.")).toBeTruthy();
  });

  it("muestra las tarjetas de los turnos cargados", () => {
    mockUseScheduleListByStatus.mockReturnValue(
      buildBaseResult({
        items: [
          {
            schedule: makeSchedule({
              id: "schedule-1",
              date: "2026-08-11",
              time: "09:00",
              status: "agendado",
            }),
            clientLabel: "Ana Torres",
          },
        ],
      }),
    );

    const { getByText } = render(<ScheduleListByStatusScreen {...buildProps()} />);

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("Agendado")).toBeTruthy();
  });

  it("al tocar una tarjeta navega cruzando de tab a ScheduleForm con el scheduleId correcto", () => {
    mockUseScheduleListByStatus.mockReturnValue(
      buildBaseResult({
        items: [
          {
            schedule: makeSchedule({ id: "schedule-123", date: "2026-08-11" }),
            clientLabel: "Ana Torres",
          },
        ],
      }),
    );
    const navigate = jest.fn();

    const { getByText } = render(
      <ScheduleListByStatusScreen {...buildProps({ navigate })} />,
    );

    fireEvent.press(getByText("Ana Torres"));

    expect(navigate).toHaveBeenCalledWith("ScheduleTab", {
      screen: "ScheduleForm",
      params: { scheduleId: "schedule-123" },
    });
  });

  it("no falla si no hay parent navigator al tocar una tarjeta", () => {
    mockUseScheduleListByStatus.mockReturnValue(
      buildBaseResult({
        items: [
          {
            schedule: makeSchedule({ id: "schedule-123", date: "2026-08-11" }),
            clientLabel: "Ana Torres",
          },
        ],
      }),
    );

    const { getByText } = render(
      <ScheduleListByStatusScreen {...buildProps(null)} />,
    );

    expect(() => fireEvent.press(getByText("Ana Torres"))).not.toThrow();
  });
});
