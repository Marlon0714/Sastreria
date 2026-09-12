import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { DateRange } from "../../schedule/domain/dateUtils";
import type { Schedule } from "../../schedule/domain/types";
import type { UseMyActivityResult } from "../hooks/useMyActivity";
import MyActivityScreen from "./MyActivityScreen";

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

const mockUseMyActivity = jest.fn<() => UseMyActivityResult>();

jest.mock("../hooks/useMyActivity", () => ({
  useMyActivity: () => mockUseMyActivity(),
}));

const baseSchedule: Schedule = {
  id: "schedule-1",
  clientId: "client-1",
  operarioId: "op-1",
  price: 40000,
  isPriority: false,
  isOwnerFlagged: false,
  category: "arreglo",
  status: "listo_para_entregar",
  statusLocked: false,
  readyAt: "2026-08-15T14:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-15T14:00:00.000Z",
  syncStatus: "pending",
};

const DAY_RANGE: DateRange = { startDate: "2026-08-15", endDate: "2026-08-15" };

function buildActivityResult(
  overrides: Partial<UseMyActivityResult> = {},
): UseMyActivityResult {
  return {
    mode: "dia",
    setMode: jest.fn(),
    anchorDate: "2026-08-15",
    periodLabel: "Sábado 15 de agosto de 2026",
    range: DAY_RANGE,
    rangeError: null,
    goToPrevious: jest.fn(),
    goToNext: jest.fn(),
    goToCurrentPeriod: jest.fn(),
    canGoToCurrentPeriod: false,
    jumpToDate: jest.fn(),
    customRangeStart: undefined,
    customRangeEnd: undefined,
    setCustomRangeStart: jest.fn(),
    setCustomRangeEnd: jest.fn(),
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

  it("recarga los datos al recibir foco (ej. al volver de marcar un arreglo listo en Agenda)", () => {
    const reload = jest.fn(async () => Promise.resolve());
    mockUseMyActivity.mockReturnValue(buildActivityResult({ reload }));

    render(<MyActivityScreen />);

    expect(reload).toHaveBeenCalledTimes(1);
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
    expect(getByText("Total bruto del día")).toBeTruthy();
    expect(getByText("$55.000")).toBeTruthy();
  });

  it("muestra el chip del selector de periodo con las 4 opciones Día/Semana/Mes/Rango", () => {
    const { getByLabelText, getByText } = render(<MyActivityScreen />);

    expect(getByText("Día")).toBeTruthy();

    fireEvent.press(getByLabelText("Cambiar periodo del resumen"));

    expect(getByText("Semana")).toBeTruthy();
    expect(getByText("Mes")).toBeTruthy();
    expect(getByText("Rango personalizado")).toBeTruthy();
  });

  it("dispara setMode al elegir una opción del selector de periodo", () => {
    const setMode = jest.fn();
    mockUseMyActivity.mockReturnValue(buildActivityResult({ setMode }));

    const { getByLabelText } = render(<MyActivityScreen />);

    fireEvent.press(getByLabelText("Cambiar periodo del resumen"));
    fireEvent.press(getByLabelText("Ver resumen por mes"));

    expect(setMode).toHaveBeenCalledWith("mes");
  });

  it("modo 'semana': muestra el label del total bruto de la semana y el empty state correspondiente", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        mode: "semana",
        periodLabel: "Semana del 10 ago al 16 ago",
        range: { startDate: "2026-08-10", endDate: "2026-08-16" },
      }),
    );

    const { getByText } = render(<MyActivityScreen />);

    expect(
      getByText("No hiciste ningún arreglo esta semana."),
    ).toBeTruthy();
  });

  it("modo 'mes': muestra el label del total bruto del mes con items", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        mode: "mes",
        periodLabel: "Agosto 2026",
        range: { startDate: "2026-08-01", endDate: "2026-08-31" },
        items: [{ schedule: baseSchedule, clientLabel: "Ana Torres" }],
        total: 40000,
      }),
    );

    const { getByText } = render(<MyActivityScreen />);

    expect(getByText("Total bruto del mes")).toBeTruthy();
  });

  it("modo 'rango' con fechas incompletas: muestra el mensaje de elegir fechas, sin lista ni total", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        mode: "rango",
        periodLabel: "",
        range: null,
        rangeError: null,
      }),
    );

    const { getByText, queryByText } = render(<MyActivityScreen />);

    expect(
      getByText("Elige fecha de inicio y fin para ver tus arreglos."),
    ).toBeTruthy();
    expect(queryByText(/Total bruto/)).toBeNull();
  });

  it("modo 'rango' con rango inválido: muestra el mensaje de corregir el rango", () => {
    mockUseMyActivity.mockReturnValue(
      buildActivityResult({
        mode: "rango",
        periodLabel: "",
        range: null,
        rangeError: "La fecha final no puede ser anterior a la fecha inicial.",
      }),
    );

    const { getByText } = render(<MyActivityScreen />);

    expect(
      getByText("Corrige el rango de fechas para ver tus arreglos."),
    ).toBeTruthy();
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
