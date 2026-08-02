import { describe, expect, it, jest } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import ScheduleStackNavigator from "./ScheduleStackNavigator";
import * as useScheduleListModule from "../features/schedule/hooks/useScheduleList";
import * as ClientsDependenciesProviderModule from "../features/clients/hooks/ClientsDependenciesProvider";

jest.mock("../features/schedule/hooks/useScheduleList");
jest.mock("../features/clients/hooks/ClientsDependenciesProvider");

describe("ScheduleStackNavigator", () => {
  it("renderiza la pantalla de lista de agenda por defecto", async () => {
    // Arrange
    jest.spyOn(useScheduleListModule, "useScheduleList").mockReturnValue({
      schedules: [],
      isLoading: false,
      isRefreshing: false,
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

    // Assert — la lista vacía muestra el empty state
    expect(await findByText("No hay turnos registrados.")).toBeTruthy();
  });
});
