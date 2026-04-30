import { describe, expect, it } from "@jest/globals";
import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import ScheduleStackNavigator from "./ScheduleStackNavigator";

describe("ScheduleStackNavigator", () => {
  it("renderiza la pantalla placeholder de agenda por defecto", async () => {
    // Arrange
    const { findByText } = render(
      <NavigationContainer>
        <ScheduleStackNavigator />
      </NavigationContainer>,
    );

    // Act
    const message = await findByText("Proximamente podras gestionar arreglos.");

    // Assert
    expect(message).toBeTruthy();
  });
});
