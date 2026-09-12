import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import type { Schedule } from "../../schedule/domain/types";
import type { ReminderItem } from "../domain/overdueSchedules";
import { RemindersList } from "./RemindersList";

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

describe("RemindersList", () => {
  it("muestra el mensaje de vacío cuando no hay items", () => {
    const { getByText } = render(
      <RemindersList items={[]} onPressItem={jest.fn()} />,
    );

    expect(getByText("No hay turnos por recoger.")).toBeTruthy();
  });

  it("renderiza cada item y dispara onPressItem con el scheduleId correcto", () => {
    const onPressItem = jest.fn();
    const items: ReminderItem[] = [
      {
        schedule: makeSchedule({ id: "s-1" }),
        clientLabel: "Ana Torres",
        daysWaiting: 32,
        severity: "vencido",
      },
      {
        schedule: makeSchedule({ id: "s-2" }),
        clientLabel: "Pedro",
        daysWaiting: 16,
        severity: "por_vencer",
      },
    ];

    const { getByText } = render(
      <RemindersList items={items} onPressItem={onPressItem} />,
    );

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("Pedro")).toBeTruthy();

    fireEvent.press(getByText("Pedro"));

    expect(onPressItem).toHaveBeenCalledWith("s-2");
  });

  it("usa 'Lleva X días guardado' desde 30 días y 'Lleva X días sin reclamarlo' antes de 30 (revertido N-113: por número de días, no por severidad)", () => {
    const items: ReminderItem[] = [
      {
        schedule: makeSchedule({ id: "s-1" }),
        clientLabel: "Ana Torres",
        daysWaiting: 32,
        severity: "vencido",
      },
      {
        schedule: makeSchedule({ id: "s-2" }),
        clientLabel: "Pedro",
        daysWaiting: 16,
        severity: "por_vencer",
      },
    ];

    const { getByText } = render(
      <RemindersList items={items} onPressItem={jest.fn()} />,
    );

    expect(getByText("Lleva 32 días guardado")).toBeTruthy();
    expect(getByText("Lleva 16 días sin reclamarlo")).toBeTruthy();
  });

  it("usa el umbral exacto de 30 días (no la severidad) para elegir el texto", () => {
    const items: ReminderItem[] = [
      {
        schedule: makeSchedule({ id: "s-1" }),
        clientLabel: "Justo en 30",
        daysWaiting: 30,
        severity: "vencido",
      },
      {
        schedule: makeSchedule({ id: "s-2" }),
        clientLabel: "Un día antes",
        daysWaiting: 29,
        severity: "por_vencer",
      },
    ];

    const { getByText } = render(
      <RemindersList items={items} onPressItem={jest.fn()} />,
    );

    expect(getByText("Lleva 30 días guardado")).toBeTruthy();
    expect(getByText("Lleva 29 días sin reclamarlo")).toBeTruthy();
  });
});
