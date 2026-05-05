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
  it("renderiza los 4 títulos de sección: Torso, Largo, Manga, Cuello", () => {
    // Arrange & Act
    const { getAllByText, getByText } = render(<Harness />);

    // "Largo" y "Cuello" aparecen como título de sección Y como label de tarjeta
    expect(getByText("Torso")).toBeTruthy();
    expect(getAllByText("Largo").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Manga")).toBeTruthy();
    expect(getAllByText("Cuello").length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza los 16 accessibilityLabels de campos numéricos", () => {
    // Arrange & Act
    const { getByLabelText } = render(<Harness />);

    // Assert — sección Torso
    expect(getByLabelText("Espalda (cm)")).toBeTruthy();
    expect(getByLabelText("Hombro (cm)")).toBeTruthy();
    expect(getByLabelText("Pecho (cm)")).toBeTruthy();
    expect(getByLabelText("Cintura (cm)")).toBeTruthy();
    expect(getByLabelText("Base (cm)")).toBeTruthy();
    // Assert — sección Largo
    expect(getByLabelText("Talle delantero (cm)")).toBeTruthy();
    expect(getByLabelText("Talle trasero (cm)")).toBeTruthy();
    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Distancia (cm)")).toBeTruthy();
    expect(getByLabelText("Separación (cm)")).toBeTruthy();
    // Assert — sección Manga
    expect(getByLabelText("Largo manga (cm)")).toBeTruthy();
    expect(getByLabelText("Ancho manga (cm)")).toBeTruthy();
    expect(getByLabelText("Brazo (cm)")).toBeTruthy();
    expect(getByLabelText("Puño (cm)")).toBeTruthy();
    // Assert — sección Cuello
    expect(getByLabelText("Escote (cm)")).toBeTruthy();
    expect(getByLabelText("Cuello (cm)")).toBeTruthy();
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
      <Harness disabled={true} defaultValues={{ espalda: "42", pecho: "96" }} />,
    );

    // Assert — el elemento accesible es el View contenedor, sin onChangeText ni editable
    const espalda = getByLabelText("Espalda (cm)");
    expect(espalda.props.onChangeText).toBeUndefined();
    expect(espalda.props.editable).toBeUndefined();

    const pecho = getByLabelText("Pecho (cm)");
    expect(pecho.props.onChangeText).toBeUndefined();
    expect(pecho.props.editable).toBeUndefined();
  });
});
