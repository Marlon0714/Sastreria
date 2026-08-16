import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import type { Schedule } from "../../schedule/domain/types";
import MyActivityScreen from "./MyActivityScreen";

interface UseMyActivityResult {
  items: { schedule: Schedule; clientLabel: string }[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseMyActivity = jest.fn<(date: string) => UseMyActivityResult>();

jest.mock("../hooks/useMyActivity", () => ({
  useMyActivity: (date: string) => mockUseMyActivity(date),
}));

jest.mock("../../schedule/domain/dateUtils", () => {
  const actual = jest.requireActual(
    "../../schedule/domain/dateUtils",
  ) as typeof import("../../schedule/domain/dateUtils");
  return { ...actual, todayDateString: () => "2026-08-15" };
});

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  operarioId: "op-1",
  price: 40000,
  isPriority: false,
  category: "arreglo",
  status: "listo_para_entregar",
  statusLocked: false,
  readyAt: "2026-08-15T14:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-15T14:00:00.000Z",
  syncStatus: "pending",
};

describe("MyActivityScreen", () => {
  beforeEach(() => {
    mockUseMyActivity.mockReset();
    mockUseMyActivity.mockReturnValue({
      items: [],
      total: 0,
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
  });

  it("muestra un estado vacío cuando no hay arreglos ese día", () => {
    const { getByText } = render(<MyActivityScreen />);
    expect(
      getByText("No hiciste ningún arreglo este día."),
    ).toBeTruthy();
  });

  it("muestra la lista de arreglos con su precio y el total del día", () => {
    mockUseMyActivity.mockReturnValue({
      items: [
        { schedule: baseSchedule, clientLabel: "Ana Torres" },
        {
          schedule: { ...baseSchedule, id: "schedule-2", price: 15000 },
          clientLabel: "Luis Gómez",
        },
      ],
      total: 55000,
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText } = render(<MyActivityScreen />);

    expect(getByText(/Ana Torres/)).toBeTruthy();
    expect(getByText(/Luis Gómez/)).toBeTruthy();
    expect(getByText("$40.000")).toBeTruthy();
    expect(getByText("$15.000")).toBeTruthy();
    expect(getByText("$55.000")).toBeTruthy();
  });

  it("navega al día anterior y siguiente con las flechas", () => {
    const { getByLabelText } = render(<MyActivityScreen />);

    fireEvent.press(getByLabelText("Día anterior"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-14");

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra 'Ir a hoy' solo tras navegar a otro día", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MyActivityScreen />,
    );

    expect(queryByLabelText("Ir a hoy")).toBeNull();

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir a hoy"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra un error con reintentar si falla la carga", () => {
    const reload = jest.fn(async () => Promise.resolve());
    mockUseMyActivity.mockReturnValue({
      items: [],
      total: 0,
      isLoading: false,
      error: "No se pudieron cargar tus arreglos.",
      reload,
    });

    const { getByText } = render(<MyActivityScreen />);
    expect(getByText("No se pudieron cargar tus arreglos.")).toBeTruthy();
  });
});
