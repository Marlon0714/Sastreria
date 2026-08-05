import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../domain/types";
import ScheduleDayViewScreen from "./ScheduleDayViewScreen";

interface UseScheduleDayViewResult {
  dateSchedules: Schedule[];
  pendingSchedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseScheduleDayView = jest.fn<(date: string) => UseScheduleDayViewResult>();
const mockFindAll = jest.fn<() => Promise<Client[]>>();

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

jest.mock("../hooks/useScheduleDayView", () => ({
  useScheduleDayView: (date: string) => mockUseScheduleDayView(date),
}));

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({
    findAll: () => mockFindAll(),
  }),
}));

// "Hoy" fijo en 2026-08-15 sin usar fake timers globales (chocan con
// findBy*/waitFor de @testing-library, que dependen de setTimeout real).
jest.mock("../domain/dateUtils", () => {
  const actual = jest.requireActual(
    "../domain/dateUtils",
  ) as typeof import("../domain/dateUtils");
  return {
    ...actual,
    todayDateString: () => "2026-08-15",
  };
});

jest.mock("../components/ScheduleDateTimePickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Pressable, Text } = jest.requireActual(
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
      ReactModule.createElement(
        Pressable,
        {
          accessibilityLabel,
          onPress: () => onChange("2026-08-20"),
        },
        ReactModule.createElement(Text, null, value ?? ""),
      ),
  };
});

type ScreenProps = React.ComponentProps<typeof ScheduleDayViewScreen>;

function buildProps(navigate: jest.Mock): ScreenProps {
  return {
    navigation: { navigate } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleDayView-test",
      name: "ScheduleDayView",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

const client: Client = {
  id: "client-1",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
  notes: null,
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

const scheduledOne: Schedule = {
  id: "schedule-1",
  clientId: client.id,
  date: "2026-08-15",
  time: "14:30",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const pendingOne: Schedule = {
  id: "schedule-2",
  clientId: client.id,
  isPriority: false,
  category: "arreglo",
  status: "pendiente",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleDayViewScreen", () => {
  beforeEach(() => {
    mockUseScheduleDayView.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([client]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
  });

  it("muestra estado de carga", () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: true,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Cargando agenda...")).toBeTruthy();
  });

  it("muestra error y permite reintentar", () => {
    const reload = jest.fn(async () => Promise.resolve());
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: "No se pudo cargar la agenda.",
      reload,
    });

    const { getByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("No se pudo cargar la agenda.")).toBeTruthy();
    fireEvent.press(getByText("Reintentar"));
    expect(reload).toHaveBeenCalled();
  });

  it("empieza en el día de hoy y no muestra 'Ir a hoy'", () => {
    const { getByText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(mockUseScheduleDayView).toHaveBeenCalledWith("2026-08-15");
    expect(getByText("No hay turnos para este día.")).toBeTruthy();
    expect(queryByLabelText("Ir a hoy")).toBeNull();
  });

  it("no muestra el badge de pendientes cuando no hay turnos sin fecha", () => {
    const { queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(queryByText("📋 Pendientes")).toBeTruthy();
    // El badge numérico solo aparece si pendingSchedules.length > 0.
    expect(queryByText("0")).toBeNull();
  });

  it("muestra el badge de pendientes y permite cambiar a esa vista desde el segmentado", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [pendingOne],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText, findByLabelText, queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("1")).toBeTruthy();

    fireEvent.press(getByText("📋 Pendientes"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (Sin fecha, schedule-2)"),
    ).toBeTruthy();
    // Al cambiar de vista, la agenda del día deja de mostrarse.
    expect(queryByText("No hay turnos para este día.")).toBeNull();
  });

  it("muestra un estado vacío propio en la vista de pendientes", () => {
    const { getByText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByText("📋 Pendientes"));

    expect(findByText("No hay turnos pendientes sin fecha.")).toBeTruthy();
  });

  it("marca los turnos prioritarios con una insignia", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [{ ...scheduledOne, isPriority: true }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(await findByText("⭐ Prioritario")).toBeTruthy();
  });

  it("navega al día anterior y siguiente con las flechas", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Día anterior"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-14");

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra 'Ir a hoy' tras navegar a otro día, y vuelve a hoy al presionarlo", () => {
    const { getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir a hoy"));
    expect(queryByLabelText("Ir a hoy")).toBeNull();
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("salta a la fecha elegida en el selector", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Elegir fecha"));

    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-20");
  });

  it("navega al formulario al presionar un turno, y al FAB para uno nuevo", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    const navigate = jest.fn();

    const { getByLabelText, findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(navigate)} />,
    );

    fireEvent.press(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    );
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      scheduleId: scheduledOne.id,
    });

    fireEvent.press(getByLabelText("Nuevo turno"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {});
  });
});
