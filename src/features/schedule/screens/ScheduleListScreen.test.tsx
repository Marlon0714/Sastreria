import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../domain/types";
import ScheduleListScreen from "./ScheduleListScreen";

interface UseScheduleListResult {
  schedules: Schedule[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseScheduleList = jest.fn<() => UseScheduleListResult>();
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

jest.mock("../hooks/useScheduleList", () => ({
  useScheduleList: () => mockUseScheduleList(),
}));

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({
    findAll: () => mockFindAll(),
  }),
}));

type ScreenProps = React.ComponentProps<typeof ScheduleListScreen>;

function buildProps(navigate: jest.Mock): ScreenProps {
  return {
    navigation: { navigate } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleList-test",
      name: "ScheduleList",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

const client: Client = {
  id: "22222222-2222-4222-8222-222222222222",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
  notes: null,
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

const schedule: Schedule = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-08-10",
  time: "14:30",
  clientId: client.id,
  notes: "Ajuste de traje",
  status: "agendado",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleListScreen", () => {
  beforeEach(() => {
    mockUseScheduleList.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([client]);
  });

  it("renders loading state", () => {
    mockUseScheduleList.mockReturnValue({
      schedules: [],
      isLoading: true,
      isRefreshing: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText } = render(
      <ScheduleListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Cargando agenda...")).toBeTruthy();
  });

  it("renders error state and retries", () => {
    const reload = jest.fn(async () => Promise.resolve());
    mockUseScheduleList.mockReturnValue({
      schedules: [],
      isLoading: false,
      isRefreshing: false,
      error: "No se pudo cargar la agenda.",
      reload,
    });

    const { getByText } = render(
      <ScheduleListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("No se pudo cargar la agenda.")).toBeTruthy();
    fireEvent.press(getByText("Reintentar"));
    expect(reload).toHaveBeenCalled();
  });

  it("renders empty state and navigates to create a schedule", () => {
    mockUseScheduleList.mockReturnValue({
      schedules: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    const navigate = jest.fn();

    const { getByText } = render(
      <ScheduleListScreen {...buildProps(navigate)} />,
    );

    expect(getByText("No hay turnos registrados.")).toBeTruthy();
    fireEvent.press(getByText("Nuevo turno"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {});
  });

  it("renders schedule cards resolving the client name and navigates on press", async () => {
    mockUseScheduleList.mockReturnValue({
      schedules: [schedule],
      isLoading: false,
      isRefreshing: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    const navigate = jest.fn();

    const { findByLabelText, getByText } = render(
      <ScheduleListScreen {...buildProps(navigate)} />,
    );

    const card = await findByLabelText(
      "Ver turno de Ana Torres el 2026-08-10",
    );
    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("Agendado")).toBeTruthy();

    fireEvent.press(card);
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      scheduleId: schedule.id,
    });
  });
});
