import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import CamisaMeasurementForm, {
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
    <CamisaMeasurementForm
      control={control}
      errors={errors}
      disabled={disabled}
    />
  );
}

describe("CamisaMeasurementForm", () => {
  it("renders all 16 measurement fields plus notes when enabled", () => {
    const { getByLabelText } = render(<Harness />);

    expect(getByLabelText("Espalda (cm)").props.editable).not.toBe(false);
    expect(getByLabelText("Hombro (cm)").props.editable).not.toBe(false);
    expect(getByLabelText("Talle delantero (cm)")).toBeTruthy();
    expect(getByLabelText("Talle trasero (cm)")).toBeTruthy();
    expect(getByLabelText("Distancia entre pezones (cm)")).toBeTruthy();
    expect(getByLabelText("Separación de sisa (cm)")).toBeTruthy();
    expect(getByLabelText("Base o cadera (cm)")).toBeTruthy();
    expect(getByLabelText("Cintura (cm)")).toBeTruthy();
    expect(getByLabelText("Pecho (cm)")).toBeTruthy();
    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Largo manga (cm)")).toBeTruthy();
    expect(getByLabelText("Ancho manga (cm)")).toBeTruthy();
    expect(getByLabelText("Escote (cm)")).toBeTruthy();
    expect(getByLabelText("Cuello (cm)")).toBeTruthy();
    expect(getByLabelText("Brazo (cm)")).toBeTruthy();
    expect(getByLabelText("Puño (cm)")).toBeTruthy();
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("disables all inputs when disabled prop is true", () => {
    const { getByLabelText } = render(<Harness disabled />);

    expect(getByLabelText("Espalda (cm)").props.editable).toBe(false);
    expect(getByLabelText("Pecho (cm)").props.editable).toBe(false);
    expect(getByLabelText("Cuello (cm)").props.editable).toBe(false);
    expect(getByLabelText("Brazo (cm)").props.editable).toBe(false);
    expect(getByLabelText("Puño (cm)").props.editable).toBe(false);
    expect(getByLabelText("Notas").props.editable).toBe(false);
  });

  it("displays default values when provided", () => {
    const { getByLabelText } = render(
      <Harness
        disabled
        defaultValues={{ pecho: "92.5", notes: "Cliente nuevo" }}
      />,
    );

    expect(getByLabelText("Pecho (cm)").props.value).toBe("92.5");
    expect(getByLabelText("Notas").props.value).toBe("Cliente nuevo");
  });
});
