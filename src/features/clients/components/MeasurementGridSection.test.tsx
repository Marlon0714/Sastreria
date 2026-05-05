import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { MeasurementGridSection } from "./MeasurementGridSection";

describe("MeasurementGridSection", () => {
  it("renderiza el título pasado como prop", () => {
    // Arrange & Act
    const { getByText } = render(
      <MeasurementGridSection title="Torso">
        <Text>hijo</Text>
      </MeasurementGridSection>,
    );

    // Assert
    expect(getByText("Torso")).toBeTruthy();
  });

  it("renderiza children dentro del contenedor", () => {
    // Arrange & Act
    const { getByText } = render(
      <MeasurementGridSection title="Manga">
        <Text>componente hijo</Text>
      </MeasurementGridSection>,
    );

    // Assert
    expect(getByText("componente hijo")).toBeTruthy();
  });
});
