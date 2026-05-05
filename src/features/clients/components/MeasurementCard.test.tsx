import { describe, expect, it } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import { MeasurementCard } from "./MeasurementCard";

interface HarnessProps {
  disabled?: boolean;
  defaultValue?: string;
  errorMessage?: string;
}

function Harness({ disabled, defaultValue, errorMessage }: HarnessProps) {
  const { control } = useForm({
    defaultValues: { campo: defaultValue ?? "" },
  });
  return (
    <MeasurementCard
      name="campo"
      label="Pecho"
      accessibilityLabel="Pecho (cm)"
      control={control}
      disabled={disabled}
      errorMessage={errorMessage}
    />
  );
}

describe("MeasurementCard", () => {
  it("renderiza TextInput con el accessibilityLabel correcto y editable cuando disabled es false", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness disabled={false} />);

    // Assert
    const input = getByLabelText("Pecho (cm)");
    expect(input).toBeTruthy();
    expect(input.props.editable).not.toBe(false);
  });

  it("muestra el valor como Text y 'cm' junto al valor cuando disabled es true y hay valor", () => {
    // Arrange & Act
    const { getByText } = render(
      <Harness disabled={true} defaultValue="95.5" />,
    );

    // Assert
    expect(getByText("95.5")).toBeTruthy();
    expect(getByText("cm")).toBeTruthy();
  });

  it("muestra el placeholder '—' cuando disabled es true y no hay valor", () => {
    // Arrange & Act
    const { getByText } = render(<Harness disabled={true} />);

    // Assert
    expect(getByText("—")).toBeTruthy();
  });

  it("muestra el texto del error cuando errorMessage está presente", () => {
    // Arrange & Act
    const { getByText } = render(
      <Harness errorMessage="Campo requerido" />,
    );

    // Assert
    expect(getByText("Campo requerido")).toBeTruthy();
  });

  it("actualiza el valor del input al escribir texto (disabled false)", () => {
    // Arrange
    const { getByLabelText } = render(<Harness disabled={false} />);
    const input = getByLabelText("Pecho (cm)");

    // Act
    fireEvent.changeText(input, "88");

    // Assert
    expect(getByLabelText("Pecho (cm)").props.value).toBe("88");
  });
});
