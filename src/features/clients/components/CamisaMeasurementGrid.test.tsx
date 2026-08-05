import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import CamisaMeasurementGrid from "./CamisaMeasurementGrid";
import {
  CAMISA_FORM_DEFAULTS,
  type CamisaFormValues,
} from "./CamisaMeasurementForm";

interface HarnessProps {
  disabled?: boolean;
  defaultValues?: Partial<CamisaFormValues>;
}

function Harness({ disabled = false, defaultValues = {} }: HarnessProps) {
  const {
    control,
    formState: { errors },
  } = useForm<CamisaFormValues>({
    defaultValues: { ...CAMISA_FORM_DEFAULTS, ...defaultValues },
  });

  return (
    <CamisaMeasurementGrid
      control={control}
      errors={errors}
      disabled={disabled}
    />
  );
}

describe("CamisaMeasurementGrid", () => {
  it("renderiza el título de sección: Medidas", () => {
    // Arrange & Act
    const { getByText } = render(<Harness />);

    // Assert
    expect(getByText("Medidas")).toBeTruthy();
  });

  it("renderiza los accessibilityLabels de campos numéricos, incluyendo los pares ajustado/ancho/normal/cruce", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness />);

    expect(getByLabelText("Espalda (cm)")).toBeTruthy();
    expect(getByLabelText("Talle delantero (cm)")).toBeTruthy();
    expect(getByLabelText("Talle trasero (cm)")).toBeTruthy();
    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Pecho ajustado (cm)")).toBeTruthy();
    expect(getByLabelText("Pecho ancho (cm)")).toBeTruthy();
    expect(getByLabelText("Cintura ajustado (cm)")).toBeTruthy();
    expect(getByLabelText("Cintura ancho (cm)")).toBeTruthy();
    expect(getByLabelText("Base ajustado (cm)")).toBeTruthy();
    expect(getByLabelText("Base ancho (cm)")).toBeTruthy();
    expect(getByLabelText("Hombro (cm)")).toBeTruthy();
    expect(getByLabelText("Largo manga (cm)")).toBeTruthy();
    expect(getByLabelText("Ancho manga (cm)")).toBeTruthy();
    expect(getByLabelText("Brazo (cm)")).toBeTruthy();
    expect(getByLabelText("Puño (cm)")).toBeTruthy();
    expect(getByLabelText("Distancia (cm)")).toBeTruthy();
    expect(getByLabelText("Separación (cm)")).toBeTruthy();
    expect(getByLabelText("Escote (cm)")).toBeTruthy();
    expect(getByLabelText("Cuello normal (cm)")).toBeTruthy();
    expect(getByLabelText("Cuello cruce (cm)")).toBeTruthy();
  });

  it("renderiza el campo de Notas", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness />);

    // Assert
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("en disabled=true, los campos con valor no muestran TextInput editable", () => {
    // Arrange & Act
    const { getByLabelText } = render(
      <Harness
        disabled={true}
        defaultValues={{ espalda: "42", pechoAjustado: "96" }}
      />,
    );

    // Assert — el elemento accesible es el View contenedor, sin onChangeText ni editable
    const espalda = getByLabelText("Espalda (cm)");
    expect(espalda.props.onChangeText).toBeUndefined();
    expect(espalda.props.editable).toBeUndefined();

    const pecho = getByLabelText("Pecho ajustado (cm)");
    expect(pecho.props.onChangeText).toBeUndefined();
    expect(pecho.props.editable).toBeUndefined();
  });
});
