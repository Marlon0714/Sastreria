import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Schedule } from "../../schedule/domain/types";
import MyActivityScreen from "./MyActivityScreen";

interface UseMyActivityResult {
  items: { schedule: Schedule; clientLabel: string }[];
  total: number;
  isLoading: boolean;
  error: string | null;
  priceError: string | null;
  reload: () => Promise<void>;
  addPrice: (scheduleId: string, price: number) => Promise<boolean>;
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

function buildActivityResult(
  overrides: Partial<UseMyActivityResult> = {},
): UseMyActivityResult {
  return {
    items: [],
    total: 0,
    isLoading: false,
    error: null,
    priceError: null,
    reload: jest.fn(async () => Promise.resolve()),
    addPrice: jest.fn(async () => Promise.resolve(true)),
    ...overrides,
  };
}

describe("MyActivityScreen", () => {
  beforeEach(() => {
    mockUseMyActivity.mockReset();
    mockUseMyActivity.mockReturnValue(buildActivityResult());
  });

  it("muestra un estado vacío cuando no hay arreglos ese día", () => {
    const { getByText } = render(<MyActivityScreen />);
    expect(
      getByText("No hiciste ningún arreglo este día."),
    ).toBeTruthy();
  });

  it("muestra la lista de arreglos con su precio y el total del día", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        items: [
          { schedule: baseSchedule, clientLabel: "Ana Torres" },
          {
            schedule: { ...baseSchedule, id: "schedule-2", price: 15000 },
            clientLabel: "Luis Gómez",
          },
        ],
        total: 55000,
      }),
    );

    const { getByText } = render(<MyActivityScreen />);

    expect(getByText(/Ana Torres/)).toBeTruthy();
    expect(getByText(/Luis Gómez/)).toBeTruthy();
    expect(getByText("$40.000")).toBeTruthy();
    expect(getByText("$15.000")).toBeTruthy();
    expect(getByText("$55.000")).toBeTruthy();
  });

  it("muestra la tira de la semana y permite saltar a un día tocándolo", () => {
    const { getByLabelText } = render(<MyActivityScreen />);

    expect(getByLabelText("Ir al Lun 10")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir al Jue 13"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-13");
  });

  it("navega a la semana anterior/siguiente con las flechas de la tira", () => {
    const { getByLabelText } = render(<MyActivityScreen />);

    fireEvent.press(getByLabelText("Semana anterior"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-08");

    fireEvent.press(getByLabelText("Semana siguiente"));
    fireEvent.press(getByLabelText("Semana siguiente"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-22");
  });

  it("muestra 'Ir a hoy' solo tras navegar a otro día", () => {
    const { getByLabelText, queryByLabelText } = render(
      <MyActivityScreen />,
    );

    expect(queryByLabelText("Ir a hoy")).toBeNull();

    fireEvent.press(getByLabelText("Ir al Jue 13"));
    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir a hoy"));
    expect(mockUseMyActivity).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra un error con reintentar si falla la carga", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({ error: "No se pudieron cargar tus arreglos." }),
    );

    const { getByText } = render(<MyActivityScreen />);
    expect(getByText("No se pudieron cargar tus arreglos.")).toBeTruthy();
  });

  it("muestra priceError en línea junto a la fila en edición, sin tapar la lista ni el total", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        items: [
          { schedule: baseSchedule, clientLabel: "Ana Torres" },
          {
            schedule: { ...baseSchedule, id: "schedule-2", price: undefined },
            clientLabel: "Luis Gómez",
          },
        ],
        total: 12345,
        priceError: "No se pudo guardar el precio.",
      }),
    );

    const { getByLabelText, getByText, queryByText } = render(
      <MyActivityScreen />,
    );

    // Sin editar ninguna fila todavía, el priceError no se muestra en ningún lado.
    expect(queryByText("No se pudo guardar el precio.")).toBeNull();

    fireEvent.press(getByLabelText("Agregar precio de Luis Gómez"));

    // Ahora sí se muestra, en línea, sin reemplazar la lista ni el total.
    expect(getByText("No se pudo guardar el precio.")).toBeTruthy();
    expect(getByText(/Ana Torres/)).toBeTruthy();
    expect(getByText("$40.000")).toBeTruthy();
    expect(getByText("$12.345")).toBeTruthy();
  });

  it("permite agregar el precio de un arreglo que no lo tenía", async () => {
    const addPrice = jest.fn(async () => Promise.resolve(true));
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        items: [
          {
            schedule: { ...baseSchedule, price: undefined },
            clientLabel: "Ana Torres",
          },
        ],
        addPrice,
      }),
    );

    const { getByLabelText, queryByText } = render(<MyActivityScreen />);

    expect(queryByText("$40.000")).toBeNull();
    fireEvent.press(getByLabelText("Agregar precio de Ana Torres"));
    fireEvent.changeText(getByLabelText("Precio del arreglo"), "30000");
    fireEvent.press(getByLabelText("Guardar precio"));

    await waitFor(() => {
      expect(addPrice).toHaveBeenCalledWith("schedule-1", 30000);
    });
  });
});
