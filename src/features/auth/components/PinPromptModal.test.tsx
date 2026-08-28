import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { PinPromptModal } from "./PinPromptModal";

describe("PinPromptModal", () => {
  it("no renderiza contenido visible cuando visible=false", () => {
    const { queryByText } = render(
      <PinPromptModal
        visible={false}
        error={null}
        onSubmit={jest.fn<(pin: string) => void>()}
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
        onSubmit={jest.fn<(pin: string) => void>()}
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
        onSubmit={jest.fn<(pin: string) => void>()}
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
        onSubmit={jest.fn<(pin: string) => void>()}
        onCancel={jest.fn()}
      />,
    );

    const input = getByLabelText("PIN");
    fireEvent.changeText(input, "1a2b3c4d5");

    expect(input.props.value).toBe("1234");
  });

  it("llama onSubmit con el PIN ingresado y limpia el campo", async () => {
    const onSubmit = jest.fn<(pin: string) => Promise<void>>().mockResolvedValue();
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
    await waitFor(() => expect(input.props.value).toBe(""));
  });

  it("deshabilita el input y el botón mientras onSubmit está en curso, y los rehabilita al terminar", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = jest.fn<(pin: string) => Promise<void>>(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
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
    const confirmButton = getByLabelText("Confirmar PIN");
    fireEvent.press(confirmButton);

    await waitFor(() =>
      expect(
        confirmButton.props.accessibilityState?.disabled ??
          confirmButton.props.disabled,
      ).toBe(true),
    );
    expect(input.props.editable).toBe(false);

    // Un segundo tap mientras la promesa sigue pendiente no debe disparar
    // una segunda verificación.
    fireEvent.press(confirmButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit?.();

    await waitFor(() => expect(input.props.editable).toBe(true));
  });

  it("llama onCancel y limpia el campo al presionar Cancelar", () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <PinPromptModal
        visible={true}
        error={null}
        onSubmit={jest.fn<(pin: string) => void>()}
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
        onSubmit={jest.fn<(pin: string) => void>()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText("PIN incorrecto. Intenta de nuevo.")).toBeTruthy();
  });

  describe("cuenta regresiva del bloqueo por intentos fallidos", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("muestra los segundos restantes y los actualiza cada segundo mientras dura el bloqueo", () => {
      const { getByText, queryByText } = render(
        <PinPromptModal
          visible={true}
          error="Demasiados intentos fallidos. Espera 30 segundos e intenta de nuevo."
          onSubmit={jest.fn<(pin: string) => void>()}
          onCancel={jest.fn()}
        />,
      );

      expect(
        getByText(
          "Demasiados intentos fallidos. Espera 30 segundos e intenta de nuevo.",
        ),
      ).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(
        getByText(
          "Demasiados intentos fallidos. Espera 29 segundos e intenta de nuevo.",
        ),
      ).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(28_000);
      });

      expect(
        getByText(
          "Demasiados intentos fallidos. Espera 1 segundo e intenta de nuevo.",
        ),
      ).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(
        queryByText(
          "Demasiados intentos fallidos. Espera 0 segundos e intenta de nuevo.",
        ),
      ).toBeNull();
    });

    it("deshabilita el botón Confirmar mientras dura el bloqueo, aunque el PIN tenga 4 dígitos", () => {
      const { getByLabelText } = render(
        <PinPromptModal
          visible={true}
          error="Demasiados intentos fallidos. Espera 30 segundos e intenta de nuevo."
          onSubmit={jest.fn<(pin: string) => void>()}
          onCancel={jest.fn()}
        />,
      );

      const input = getByLabelText("PIN");
      fireEvent.changeText(input, "1234");
      const confirmButton = getByLabelText("Confirmar PIN");

      expect(
        confirmButton.props.accessibilityState?.disabled ??
          confirmButton.props.disabled,
      ).toBe(true);

      act(() => {
        jest.advanceTimersByTime(30_000);
      });

      expect(
        confirmButton.props.accessibilityState?.disabled ??
          confirmButton.props.disabled,
      ).toBe(false);
    });
  });
});
