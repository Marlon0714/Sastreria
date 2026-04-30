import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import PantalonMeasurementForm, {
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
    <PantalonMeasurementForm
      control={control}
      errors={errors}
      disabled={disabled}
    />
  );
}

describe("PantalonMeasurementForm", () => {
  it("renders all 7 measurement fields plus notes when enabled", () => {
    const { getByLabelText } = render(<Harness />);

    expect(getByLabelText("Largo (cm)")).toBeTruthy();
    expect(getByLabelText("Cintura (cm)")).toBeTruthy();
    expect(getByLabelText("Base (cm)")).toBeTruthy();
    expect(getByLabelText("Tiro (cm)")).toBeTruthy();
    expect(getByLabelText("Pierna (cm)")).toBeTruthy();
    expect(getByLabelText("Rodilla (cm)")).toBeTruthy();
    expect(getByLabelText("Bota (cm)")).toBeTruthy();
    expect(getByLabelText("Notas")).toBeTruthy();
  });

  it("disables all inputs when disabled prop is true", () => {
    const { getByLabelText } = render(<Harness disabled />);

    expect(getByLabelText("Largo (cm)").props.editable).toBe(false);
    expect(getByLabelText("Tiro (cm)").props.editable).toBe(false);
    expect(getByLabelText("Notas").props.editable).toBe(false);
  });

  it("displays default values when provided", () => {
    const { getByLabelText } = render(
      <Harness disabled defaultValues={{ largo: "100", tiro: "30.5" }} />,
    );

    expect(getByLabelText("Largo (cm)").props.value).toBe("100");
    expect(getByLabelText("Tiro (cm)").props.value).toBe("30.5");
  });
});
