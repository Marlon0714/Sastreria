import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";

import { PinPromptModal } from "./PinPromptModal";

describe("PinPromptModal", () => {
  it("no renderiza contenido visible cuando visible=false", () => {
    const { queryByText } = render(
      <PinPromptModal
        visible={false}
        error={null}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(queryByText("¿Quién eres?")).toBeNull();
  });

  it("muestra el título y el input de PIN cuando visible=true", () => {
    const { getByText, getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText("¿Quién eres?")).toBeTruthy();
    expect(getByLabelText("PIN")).toBeTruthy();
  });

  it("el botón Confirmar está deshabilitado hasta escribir 4 dígitos", () => {
    const { getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const input = getByLabelText("PIN");
    const confirmButton = getByLabelText("Confirmar PIN");

    expect(
      confirmButton.props.accessibilityState?.disabled ??
        confirmButton.props.disabled,
    ).toBe(true);

    fireEvent.changeText(input, "12");
    expect(
      confirmButton.props.accessibilityState?.disabled ??
        confirmButton.props.disabled,
    ).toBe(true);

    fireEvent.changeText(input, "1234");
    expect(
      confirmButton.props.accessibilityState?.disabled ??
        confirmButton.props.disabled,
    ).toBe(false);
  });

  it("descarta caracteres no numéricos y limita a 4 dígitos", () => {
    const { getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const input = getByLabelText("PIN");
    fireEvent.changeText(input, "1a2b3c4d5");

    expect(input.props.value).toBe("1234");
  });

  it("llama onSubmit con el PIN ingresado y limpia el campo", () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    const input = getByLabelText("PIN");
    fireEvent.changeText(input, "1234");
    fireEvent.press(getByLabelText("Confirmar PIN"));

    expect(onSubmit).toHaveBeenCalledWith("1234");
    expect(input.props.value).toBe("");
  });

  it("llama onCancel y limpia el campo al presionar Cancelar", () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />,
    );

    const input = getByLabelText("PIN");
    fireEvent.changeText(input, "12");
    fireEvent.press(getByLabelText("Cancelar"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(input.props.value).toBe("");
  });

  it("muestra el mensaje de error cuando se provee", () => {
    const { getByText } = render(
      <PinPromptModal
        visible={true}
        error="PIN incorrecto. Intenta de nuevo."
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText("PIN incorrecto. Intenta de nuevo.")).toBeTruthy();
  });
});
