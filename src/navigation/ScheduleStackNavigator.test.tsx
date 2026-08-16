import { describe, expect, it, jest } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import ScheduleStackNavigator from "./ScheduleStackNavigator";
import * as useScheduleDayViewModule from "../features/schedule/hooks/useScheduleDayView";
import * as ClientsDependenciesProviderModule from "../features/clients/hooks/ClientsDependenciesProvider";

jest.mock("../features/schedule/hooks/useScheduleDayView");
jest.mock("../features/clients/hooks/ClientsDependenciesProvider");
jest.mock("../features/auth/components/LogoutButton", () => ({
  LogoutButton: () => null,
}));
jest.mock("../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getAll: async () => Promise.resolve([]),
  }),
}));

describe("ScheduleStackNavigator", () => {
  it("renderiza la vista día-por-día de la agenda por defecto", async () => {
    // Arrange
    jest
      .spyOn(useScheduleDayViewModule, "useScheduleDayView")
      .mockReturnValue({
        dateSchedules: [],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });
    jest
      .spyOn(ClientsDependenciesProviderModule, "useClientRepository")
      .mockReturnValue({
        create: jest.fn(async () => Promise.reject(new Error("unused"))),
        findAll: jest.fn(async () => Promise.resolve([])),
        findById: jest.fn(async () => Promise.resolve(null)),
        update: jest.fn(async () => Promise.reject(new Error("unused"))),
        delete: jest.fn(async () => Promise.resolve()),
      });

    const { findByText } = render(
      <NavigationContainer>
        <ScheduleStackNavigator />
      </NavigationContainer>,
    );

    // Assert — el día actual no tiene turnos
    expect(await findByText("No hay turnos para este día.")).toBeTruthy();
  });
});
