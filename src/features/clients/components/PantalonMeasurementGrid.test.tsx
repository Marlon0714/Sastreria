import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import PantalonMeasurementGrid from "./PantalonMeasurementGrid";
import {
  PANTALON_FORM_DEFAULTS,
  type PantalonFormValues,
} from "./PantalonMeasurementForm";

interface HarnessProps {
  disabled?: boolean;
  defaultValues?: Partial<PantalonFormValues>;
}

function Harness({ disabled = false, defaultValues = {} }: HarnessProps) {
  const {
    control,
    formState: { errors },
  } = useForm<PantalonFormValues>({
    defaultValues: { ...PANTALON_FORM_DEFAULTS, ...defaultValues },
  });

  return (
    <PantalonMeasurementGrid
      control={control}
      errors={errors}
      disabled={disabled}
    />
  );
}

describe("PantalonMeasurementGrid", () => {
  it("renderiza los 2 títulos de sección: Longitud y Contorno", () => {
    // Arrange & Act
    const { getByText } = render(<Harness />);

    // Assert
    expect(getByText("Longitud")).toBeTruthy();
    expect(getByText("Contorno")).toBeTruthy();
  });

  it("renderiza los 7 accessibilityLabels de campos numéricos", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness />);

    // Assert — sección Longitud
    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Pierna (cm)")).toBeTruthy();
    expect(getByLabelText("Rodilla (cm)")).toBeTruthy();
    expect(getByLabelText("Bota (cm)")).toBeTruthy();
    // Assert — sección Contorno
    expect(getByLabelText("Cintura (cm)")).toBeTruthy();
    expect(getByLabelText("Base (cm)")).toBeTruthy();
    expect(getByLabelText("Tiro (cm)")).toBeTruthy();
  });

  it("renderiza el campo de Notas", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness />);

    // Assert
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("en disabled=false, los campos son editables", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness disabled={false} />);

    // Assert — los TextInputs tienen editable no establecido como false
    expect(getByLabelText("Largo (cm)").props.editable).not.toBe(false);
    expect(getByLabelText("Cintura (cm)").props.editable).not.toBe(false);
    expect(getByLabelText("Tiro (cm)").props.editable).not.toBe(false);
  });

  it("en disabled=true con valor, no renderiza TextInput editable", () => {
    // Arrange & Act
    const { getByLabelText } = render(
      <Harness disabled defaultValues={{ largo: "102", cintura: "88" }} />,
    );

    // Assert — en modo vista el accessibilityLabel está en el View, no en un TextInput
    const largoEl = getByLabelText("Largo (cm)");
    expect(largoEl.props.onChangeText).toBeUndefined();
    const cinturaEl = getByLabelText("Cintura (cm)");
    expect(cinturaEl.props.onChangeText).toBeUndefined();
  });
});
